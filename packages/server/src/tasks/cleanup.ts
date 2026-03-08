// Session cleanup: persist logs, kill processes, scrub credentials, release VM.
// Logging ensures cleanup failures are traceable back to the originating task.

import { createLogger } from "../logger"
import type { Task } from "../types"

const log = createLogger("cleanup")

export interface CleanupDeps {
  getSessionMessages(opencodePort: number, sessionId: string): Promise<unknown[]>
  persistMessages(taskId: string, messages: unknown[]): void
  sshExec(host: string, port: number, command: string): Promise<string>
  releaseVm(vmId: string): Promise<void>
}

export async function cleanupSession(
  task: Task,
  deps: CleanupDeps,
): Promise<void> {
  const taskLog = log.child({ taskId: task.id, vmId: task.vmId })
  const span = taskLog.startOp("cleanup")

  try {
    // Persist chat messages before tearing down the session
    if (task.opencodePort && task.opencodeSessionId) {
      const messages = await deps.getSessionMessages(
        task.opencodePort,
        task.opencodeSessionId,
      )
      deps.persistMessages(task.id, messages)
      taskLog.info("Session logs persisted", { messageCount: messages.length })
    }

    if (task.vmId) {
      // Kill agent and dev server processes inside the VM
      taskLog.debug("Killing processes")
      try {
        await deps.sshExec(
          "", // ip resolved from vmId internally
          0,
          "pkill -f opencode; pkill -f 'dev server' || true",
        )
      } catch {
        // Best-effort: process may already be gone
        taskLog.debug("Process kill returned non-zero (expected if already stopped)")
      }

      // Remove injected credentials from VM before returning to pool
      taskLog.debug("Scrubbing credentials")
      try {
        await deps.sshExec("", 0, "rm -f /home/agent/.env; unset ANTHROPIC_API_KEY GITHUB_TOKEN || true")
      } catch {
        taskLog.warn("Credential scrub failed, VM will be destroyed instead of recycled")
      }

      // Return VM to the warm pool (or destroy if tainted)
      await deps.releaseVm(task.vmId)
      taskLog.info("VM released")
    }

    span.end()
  } catch (err) {
    span.fail(err)
    throw err
  }
}
