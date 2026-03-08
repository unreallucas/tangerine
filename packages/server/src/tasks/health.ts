// Health checker: periodically verifies running tasks are alive.
// Logs each check so recovery actions are traceable.

import { createLogger } from "../logger"
import type { Task } from "../types"

const log = createLogger("health")

export interface HealthCheckDeps {
  listRunningTasks(): Task[]
  checkOpencodeHealth(opencodePort: number): Promise<boolean>
  checkVmHealth(vmId: string): Promise<boolean>
  restartOpencode(task: Task): Promise<void>
  failTask(taskId: string, reason: string): void
}

export async function runHealthChecks(deps: HealthCheckDeps): Promise<void> {
  const tasks = deps.listRunningTasks()
  log.debug("Health check started", { runningTaskCount: tasks.length })

  for (const task of tasks) {
    const taskLog = log.child({ taskId: task.id, vmId: task.vmId })

    try {
      // Check VM is still reachable
      if (task.vmId) {
        const vmAlive = await deps.checkVmHealth(task.vmId)
        if (!vmAlive) {
          taskLog.warn("Task unhealthy, recovering", { reason: "vm-unreachable" })
          taskLog.error("Recovery failed, marking task failed", {
            reason: "VM is unreachable, cannot recover",
          })
          deps.failTask(task.id, "VM became unreachable")
          continue
        }
      }

      // Check OpenCode server is responding
      if (task.opencodePort) {
        const healthy = await deps.checkOpencodeHealth(task.opencodePort)
        if (!healthy) {
          taskLog.warn("Task unhealthy, recovering", { reason: "opencode-unresponsive" })
          try {
            await deps.restartOpencode(task)
            taskLog.info("Recovery succeeded", { action: "opencode-restart" })
          } catch (err) {
            taskLog.error("Recovery failed, marking task failed", {
              reason: err instanceof Error ? err.message : String(err),
            })
            deps.failTask(task.id, "OpenCode server unresponsive and restart failed")
            continue
          }
        }
      }

      taskLog.debug("Task healthy")
    } catch (err) {
      taskLog.error("Health check error", {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
