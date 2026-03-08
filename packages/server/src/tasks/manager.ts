// Task manager: CRUD operations and state transitions for tasks.
// Logs task creation, cancellation, completion, and prompt queueing for timeline reconstruction.

import { createLogger } from "../logger"
import type { Task, TaskSource, TaskStatus } from "../types"

const log = createLogger("tasks")

export interface TaskManagerDeps {
  insertTask(task: Task): void
  updateTask(taskId: string, updates: Partial<Task>): void
  getTask(taskId: string): Task | undefined
  listTasks(filter?: { status?: TaskStatus }): Task[]
  startSession(task: Task): Promise<void>
  cleanupSession(task: Task): Promise<void>
  abortAgent(opencodePort: number, sessionId: string): Promise<void>
}

// Prompt queue per task (sent sequentially so agent completes one before starting next)
const promptQueues = new Map<string, string[]>()

export function createTask(
  deps: TaskManagerDeps,
  params: {
    source: TaskSource
    sourceId?: string
    sourceUrl?: string
    repoUrl: string
    title: string
    description?: string
  },
): Task {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const task: Task = {
    id,
    source: params.source,
    sourceId: params.sourceId ?? null,
    sourceUrl: params.sourceUrl ?? null,
    repoUrl: params.repoUrl,
    title: params.title,
    description: params.description ?? null,
    status: "created",
    vmId: null,
    branch: null,
    prUrl: null,
    userId: null,
    opencodeSessionId: null,
    opencodePort: null,
    previewPort: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
  }

  deps.insertTask(task)
  log.info("Task created", { taskId: id, source: params.source, title: params.title })

  // Kick off provisioning asynchronously
  deps.startSession(task).catch((err) => {
    log.error("Session start failed", {
      taskId: id,
      error: err instanceof Error ? err.message : String(err),
    })
  })

  return task
}

export async function cancelTask(
  deps: TaskManagerDeps,
  taskId: string,
): Promise<void> {
  const task = deps.getTask(taskId)
  if (!task) {
    log.warn("Cancel requested for unknown task", { taskId })
    return
  }

  log.info("Task cancelled", { taskId })
  deps.updateTask(taskId, {
    status: "cancelled",
    completedAt: new Date().toISOString(),
  })

  // Clean up any running session
  if (task.status === "running" || task.status === "provisioning") {
    await deps.cleanupSession(task).catch((err) => {
      log.error("Cleanup after cancel failed", {
        taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
}

export async function completeTask(
  deps: TaskManagerDeps,
  taskId: string,
): Promise<void> {
  const task = deps.getTask(taskId)
  if (!task) {
    log.warn("Complete requested for unknown task", { taskId })
    return
  }

  const now = new Date().toISOString()
  let durationMs: number | undefined
  if (task.startedAt) {
    durationMs = new Date(now).getTime() - new Date(task.startedAt).getTime()
  }

  deps.updateTask(taskId, { status: "done", completedAt: now })
  log.info("Task completed", { taskId, durationMs })

  await deps.cleanupSession(task).catch((err) => {
    log.error("Cleanup after completion failed", {
      taskId,
      error: err instanceof Error ? err.message : String(err),
    })
  })
}

export function queuePrompt(taskId: string, prompt: string): void {
  let queue = promptQueues.get(taskId)
  if (!queue) {
    queue = []
    promptQueues.set(taskId, queue)
  }
  queue.push(prompt)
  log.debug("Prompt queued", { taskId, queueLength: queue.length })
}

export function dequeuePrompt(taskId: string): string | undefined {
  const queue = promptQueues.get(taskId)
  if (!queue || queue.length === 0) return undefined
  return queue.shift()
}

export async function abortAgent(
  deps: TaskManagerDeps,
  taskId: string,
): Promise<void> {
  const task = deps.getTask(taskId)
  if (!task?.opencodePort || !task.opencodeSessionId) {
    log.warn("Abort requested but no active session", { taskId })
    return
  }

  log.info("Agent aborted", { taskId })
  try {
    await deps.abortAgent(task.opencodePort, task.opencodeSessionId)
  } catch (err) {
    log.error("Agent abort failed", {
      taskId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
