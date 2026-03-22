// In-memory build state manager for golden image builds.
// If the server restarts mid-build, state resets to idle — acceptable for local-first.

import { Effect } from "effect"
import { createLogger } from "../logger"
import { buildBase, buildImage } from "./build"
import type { TaskRow } from "../db/types"
import type { Logger } from "../logger"

export interface BuildState {
  status: "building" | "success" | "failed"
  imageName: string
  startedAt: string
  finishedAt?: string
  error?: string
}

export interface PreTeardownDeps {
  listTasks: (filter: { projectId: string }) => Effect.Effect<TaskRow[], Error>
  getVm: (vmId: string) => Effect.Effect<{ ip: string | null; ssh_port: number | null } | null, Error>
  sshExec: (host: string, port: number, command: string) => Effect.Effect<string, Error>
}

let currentBuild: BuildState | null = null

export function startBuild(imageName: string): { ok: true } | { ok: false; reason: string } {
  if (currentBuild?.status === "building") {
    return { ok: false, reason: `Already building image "${currentBuild.imageName}"` }
  }

  currentBuild = {
    status: "building",
    imageName,
    startedAt: new Date().toISOString(),
  }

  const log = createLogger("image:build")

  // Fire-and-forget — state updated on completion/failure
  // Dashboard rebuilds only the project layer; base must already exist
  buildImage(imageName, log, { requireBase: true })
    .then(() => {
      if (currentBuild?.imageName === imageName && currentBuild.status === "building") {
        currentBuild = {
          ...currentBuild,
          status: "success",
          finishedAt: new Date().toISOString(),
        }
      }
    })
    .catch((err) => {
      const errorMessage = err instanceof Error ? err.message : String(err)
      log.error("Build failed", { imageName, error: errorMessage })
      if (currentBuild?.imageName === imageName && currentBuild.status === "building") {
        currentBuild = {
          ...currentBuild,
          status: "failed",
          finishedAt: new Date().toISOString(),
          error: errorMessage,
        }
      }
    })

  return { ok: true }
}

/**
 * Push all unpushed task branches to remote before VM teardown.
 * Best-effort: logs failures but doesn't block the build.
 */
async function pushTaskBranches(
  projectId: string,
  deps: PreTeardownDeps,
  log: Logger,
): Promise<{ pushed: string[]; failed: string[] }> {
  const pushed: string[] = []
  const failed: string[] = []

  const tasks = await Effect.runPromise(
    deps.listTasks({ projectId }).pipe(Effect.catchAll(() => Effect.succeed([] as TaskRow[])))
  )

  // Only tasks with a branch and an active VM
  const tasksWithBranches = tasks.filter(
    (t) => t.branch && t.vm_id && ["running", "done", "failed", "created"].includes(t.status)
  )

  for (const task of tasksWithBranches) {
    try {
      const vm = await Effect.runPromise(
        deps.getVm(task.vm_id!).pipe(Effect.catchAll(() => Effect.succeed(null)))
      )
      if (!vm?.ip || !vm.ssh_port) continue

      const workdir = task.worktree_path ?? "/workspace/repo"
      const cmd = `cd ${workdir} && git push origin ${task.branch} --force-with-lease 2>&1 || true`
      await Effect.runPromise(
        deps.sshExec(vm.ip, vm.ssh_port, cmd).pipe(Effect.catchAll(() => Effect.succeed("")))
      )
      pushed.push(task.branch!)
      log.info("Pushed branch before teardown", { taskId: task.id, branch: task.branch })
    } catch {
      failed.push(task.branch!)
      log.warn("Failed to push branch before teardown", { taskId: task.id, branch: task.branch })
    }
  }

  return { pushed, failed }
}

export function startBaseBuild(projectImageName?: string, preTeardownDeps?: { projectId: string; deps: PreTeardownDeps }): { ok: true } | { ok: false; reason: string } {
  if (currentBuild?.status === "building") {
    return { ok: false, reason: `Already building image "${currentBuild.imageName}"` }
  }

  currentBuild = {
    status: "building",
    imageName: "base",
    startedAt: new Date().toISOString(),
  }

  const log = createLogger("image:build")

  // Pre-teardown: push branches before anything gets destroyed
  const prePush = preTeardownDeps
    ? pushTaskBranches(preTeardownDeps.projectId, preTeardownDeps.deps, log)
    : Promise.resolve({ pushed: [], failed: [] })

  prePush
    .then(() => buildBase(log))
    .then(async () => {
      if (!projectImageName) {
        if (currentBuild?.imageName === "base" && currentBuild.status === "building") {
          currentBuild = { ...currentBuild, status: "success", finishedAt: new Date().toISOString() }
        }
        return
      }

      log.info("Base build done, chaining project image rebuild", { projectImageName })
      currentBuild = {
        status: "building",
        imageName: projectImageName,
        startedAt: new Date().toISOString(),
      }

      await buildImage(projectImageName, log, { requireBase: true })

      if (currentBuild?.imageName === projectImageName && currentBuild.status === "building") {
        currentBuild = { ...currentBuild, status: "success", finishedAt: new Date().toISOString() }
      }
    })
    .catch((err) => {
      const errorMessage = err instanceof Error ? err.message : String(err)
      log.error("Build failed", { error: errorMessage })
      if (currentBuild?.status === "building") {
        currentBuild = { ...currentBuild, status: "failed", finishedAt: new Date().toISOString(), error: errorMessage }
      }
    })

  return { ok: true }
}

export function getBuildStatus(): BuildState | { status: "idle" } {
  return currentBuild ?? { status: "idle" }
}
