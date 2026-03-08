// Session lifecycle: provision VM, clone repo, start OpenCode, establish tunnels.
// Each step is logged so an AI agent can reconstruct failures from taskId alone.

import { createLogger, truncate } from "../logger"
import type { Task, ProjectConfig, SessionTunnel } from "../types"

const log = createLogger("lifecycle")

export interface LifecycleDeps {
  acquireVm(taskId: string): Promise<{ vmId: string; ip: string; sshPort: number }>
  sshExec(host: string, port: number, command: string): Promise<string>
  waitForSsh(host: string, port: number): Promise<void>
  injectCredentials(host: string, port: number, credentials: Record<string, string>): Promise<void>
  createTunnel(vmIp: string, sshPort: number, ports: { opencodeVmPort: number; previewVmPort: number }): Promise<SessionTunnel>
  createOpencodeSession(opencodePort: number, title: string): Promise<string>
  waitForHealth(opencodePort: number): Promise<void>
  updateTask(taskId: string, updates: Partial<Task>): void
}

export async function startSession(
  task: Task,
  config: ProjectConfig,
  deps: LifecycleDeps,
): Promise<void> {
  const taskLog = log.child({ taskId: task.id })
  const sessionSpan = taskLog.startOp("session-start")

  try {
    // Acquire a VM from the warm pool (or provision a new one)
    taskLog.info("Acquiring VM")
    const vm = await deps.acquireVm(task.id)
    const vmLog = taskLog.child({ vmId: vm.vmId })

    deps.updateTask(task.id, { vmId: vm.vmId, status: "provisioning" })

    // Wait for SSH to become available
    const sshSpan = vmLog.startOp("ssh-connect")
    try {
      await deps.waitForSsh(vm.ip, vm.sshPort)
      sshSpan.end()
    } catch (err) {
      sshSpan.fail(err)
      throw err
    }

    // Inject credentials (API keys, GitHub token) into VM environment
    vmLog.debug("Injecting credentials")
    await deps.injectCredentials(vm.ip, vm.sshPort, {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
      GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? "",
    })
    vmLog.debug("Credentials injected")

    // Clone the repository
    const cloneSpan = vmLog.startOp("clone-repo", { repo: task.repoUrl })
    try {
      await deps.sshExec(
        vm.ip,
        vm.sshPort,
        `git clone ${task.repoUrl} /workspace/repo`,
      )
      cloneSpan.end({ repo: task.repoUrl })
    } catch (err) {
      cloneSpan.fail(err, { repo: task.repoUrl })
      throw err
    }

    // Create a working branch for this task
    const branch = `tangerine/${task.id.slice(0, 8)}`
    await deps.sshExec(
      vm.ip,
      vm.sshPort,
      `cd /workspace/repo && git checkout -b ${branch}`,
    )
    vmLog.debug("Branch created", { branch })
    deps.updateTask(task.id, { branch })

    // Run project-specific setup
    const setupSpan = vmLog.startOp("setup")
    try {
      await deps.sshExec(vm.ip, vm.sshPort, `cd /workspace/repo && ${config.setup}`)
      setupSpan.end()
    } catch (err) {
      setupSpan.fail(err)
      throw err
    }

    // Start OpenCode server inside the VM
    await deps.sshExec(
      vm.ip,
      vm.sshPort,
      `cd /workspace/repo && opencode serve --port 4096 --hostname 0.0.0.0 &`,
    )
    vmLog.info("OpenCode started")

    // Establish SSH tunnels for OpenCode API and preview
    const tunnel = await deps.createTunnel(vm.ip, vm.sshPort, {
      opencodeVmPort: 4096,
      previewVmPort: config.preview.port,
    })
    vmLog.info("Tunnel established", {
      opencodePort: tunnel.opencodePort,
      previewPort: tunnel.previewPort,
    })
    deps.updateTask(task.id, {
      opencodePort: tunnel.opencodePort,
      previewPort: tunnel.previewPort,
    })

    // Wait for OpenCode to become healthy before creating a session
    const healthSpan = vmLog.startOp("opencode-health-wait")
    try {
      await deps.waitForHealth(tunnel.opencodePort)
      healthSpan.end()
    } catch (err) {
      healthSpan.fail(err)
      throw err
    }

    // Create an OpenCode session for this task
    const opencodeSessionId = await deps.createOpencodeSession(
      tunnel.opencodePort,
      task.title,
    )
    deps.updateTask(task.id, {
      opencodeSessionId,
      status: "running",
      startedAt: new Date().toISOString(),
    })

    vmLog.info("Session ready", { opencodeSessionId })
    sessionSpan.end({ vmId: vm.vmId, opencodeSessionId })
  } catch (err) {
    sessionSpan.fail(err, { phase: "session-start" })
    deps.updateTask(task.id, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
