// Prompt queue: buffers user messages while the agent is busy.
// Logs enqueue/dequeue so prompt ordering issues can be debugged.

import { createLogger, truncate } from "../logger"

const log = createLogger("prompt-queue")

type AgentState = "idle" | "busy"

interface QueueEntry {
  text: string
  enqueuedAt: number
}

interface TaskQueue {
  entries: QueueEntry[]
  state: AgentState
}

const queues = new Map<string, TaskQueue>()

function getQueue(taskId: string): TaskQueue {
  let q = queues.get(taskId)
  if (!q) {
    q = { entries: [], state: "idle" }
    queues.set(taskId, q)
  }
  return q
}

export type SendPromptFn = (taskId: string, text: string) => Promise<void>

export function enqueue(taskId: string, text: string): void {
  const q = getQueue(taskId)
  q.entries.push({ text, enqueuedAt: Date.now() })
  log.debug("Prompt enqueued", { taskId, queueLength: q.entries.length })
}

export function setAgentState(taskId: string, state: AgentState): void {
  const q = getQueue(taskId)
  const prev = q.state
  q.state = state
  if (prev !== state) {
    log.debug("Agent state changed", { taskId, state, previousState: prev })
  }
}

export async function drainNext(
  taskId: string,
  sendPrompt: SendPromptFn,
): Promise<boolean> {
  const q = getQueue(taskId)
  if (q.state !== "idle" || q.entries.length === 0) return false

  const entry = q.entries.shift()!
  q.state = "busy"

  log.info("Sending next prompt", {
    taskId,
    promptPreview: truncate(entry.text, 80),
    waitedMs: Date.now() - entry.enqueuedAt,
  })

  try {
    await sendPrompt(taskId, entry.text)
  } catch (err) {
    // Put it back at the front on failure
    q.entries.unshift(entry)
    q.state = "idle"
    log.error("Prompt send failed, re-queued", {
      taskId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }

  return true
}

export function clearQueue(taskId: string): void {
  queues.delete(taskId)
}
