import { describe, it, expect, beforeEach } from "bun:test"
import type { Database } from "bun:sqlite"
import { createTestDb } from "./helpers"
import {
  createTask,
  getTask,
  updateTask,
  updateTaskStatus,
  assignVm,
  createVm,
  insertSessionLog,
  getSessionLogs,
} from "../db/queries"

/**
 * Tracer bullet: Task creation -> Status transitions -> Session logs
 *
 * Validates the full task lifecycle through DB state transitions,
 * including VM assignment, session tracking, and log retrieval.
 */
describe("tracer: task lifecycle", () => {
  let db: Database

  beforeEach(() => {
    db = createTestDb()
  })

  it("walks through the full happy-path lifecycle", () => {
    // 1. Create task (status: created)
    const task = createTask(db, {
      id: "task-lifecycle",
      source: "github",
      repo_url: "https://github.com/test/repo",
      title: "Implement feature X",
      description: "Full lifecycle test",
      source_id: "test/repo#1",
      source_url: "https://github.com/test/repo/issues/1",
    })
    expect(task.status).toBe("created")
    expect(task.vm_id).toBeNull()
    expect(task.opencode_session_id).toBeNull()

    // 2. Simulate provisioning (update status)
    const provisioning = updateTaskStatus(db, "task-lifecycle", "provisioning")
    expect(provisioning!.status).toBe("provisioning")

    // 3. Provision and assign a VM
    createVm(db, {
      id: "vm-lc",
      label: "lifecycle-vm",
      provider: "lima",
      snapshot_id: "snap-1",
      region: "local",
      plan: "default",
      status: "ready",
    })
    assignVm(db, "vm-lc", "task-lifecycle")
    const withVm = updateTask(db, "task-lifecycle", { vm_id: "vm-lc" })
    expect(withVm!.vm_id).toBe("vm-lc")

    // 4. Simulate running (update opencode session fields)
    const running = updateTask(db, "task-lifecycle", {
      status: "running",
      opencode_session_id: "oc-session-123",
      opencode_port: 8080,
      preview_port: 3000,
      started_at: new Date().toISOString(),
    })
    expect(running!.status).toBe("running")
    expect(running!.opencode_session_id).toBe("oc-session-123")
    expect(running!.opencode_port).toBe(8080)
    expect(running!.preview_port).toBe(3000)
    expect(running!.started_at).toBeDefined()

    // 5. Insert session logs (simulate chat messages)
    insertSessionLog(db, {
      task_id: "task-lifecycle",
      role: "user",
      content: "Implement feature X with tests",
    })
    insertSessionLog(db, {
      task_id: "task-lifecycle",
      role: "assistant",
      content: "I'll start by creating the feature module...",
    })
    insertSessionLog(db, {
      task_id: "task-lifecycle",
      role: "assistant",
      content: "Feature implemented. Here's what I did...",
    })

    // 6. Retrieve session logs and verify order
    const logs = getSessionLogs(db, "task-lifecycle")
    expect(logs).toHaveLength(3)
    expect(logs[0]!.role).toBe("user")
    expect(logs[0]!.content).toBe("Implement feature X with tests")
    expect(logs[1]!.role).toBe("assistant")
    expect(logs[2]!.role).toBe("assistant")
    // Logs should be ordered by timestamp ascending
    expect(logs[0]!.timestamp <= logs[1]!.timestamp).toBe(true)
    expect(logs[1]!.timestamp <= logs[2]!.timestamp).toBe(true)

    // 7. Simulate completion (set status to done, set pr_url)
    const done = updateTask(db, "task-lifecycle", {
      status: "done",
      pr_url: "https://github.com/test/repo/pull/42",
      branch: "feat/feature-x",
      completed_at: new Date().toISOString(),
    })
    expect(done!.status).toBe("done")
    expect(done!.pr_url).toBe("https://github.com/test/repo/pull/42")
    expect(done!.branch).toBe("feat/feature-x")
    expect(done!.completed_at).toBeDefined()

    // 8. Verify full task history is retrievable
    const final = getTask(db, "task-lifecycle")!
    expect(final.source).toBe("github")
    expect(final.source_id).toBe("test/repo#1")
    expect(final.status).toBe("done")
    expect(final.vm_id).toBe("vm-lc")
    expect(final.opencode_session_id).toBe("oc-session-123")
    expect(final.pr_url).toBe("https://github.com/test/repo/pull/42")
    expect(final.created_at).toBeDefined()
    expect(final.started_at).toBeDefined()
    expect(final.completed_at).toBeDefined()
  })

  it("handles the cancellation flow", () => {
    createTask(db, {
      id: "task-cancel",
      source: "manual",
      repo_url: "https://github.com/test/repo",
      title: "Task to cancel",
    })

    // Move to running
    updateTaskStatus(db, "task-cancel", "running")

    // Insert a log before cancellation
    insertSessionLog(db, {
      task_id: "task-cancel",
      role: "user",
      content: "Start working on this",
    })

    // Cancel the task
    const cancelled = updateTask(db, "task-cancel", {
      status: "cancelled",
      completed_at: new Date().toISOString(),
    })
    expect(cancelled!.status).toBe("cancelled")
    expect(cancelled!.completed_at).toBeDefined()

    // Logs should still be retrievable after cancellation
    const logs = getSessionLogs(db, "task-cancel")
    expect(logs).toHaveLength(1)
    expect(logs[0]!.content).toBe("Start working on this")
  })

  it("handles the failure flow with error message", () => {
    createTask(db, {
      id: "task-fail",
      source: "github",
      repo_url: "https://github.com/test/repo",
      title: "Task that fails",
    })

    updateTaskStatus(db, "task-fail", "provisioning")

    // Simulate failure during provisioning
    const failed = updateTask(db, "task-fail", {
      status: "failed",
      error: "VM provisioning timed out after 300s",
      completed_at: new Date().toISOString(),
    })
    expect(failed!.status).toBe("failed")
    expect(failed!.error).toBe("VM provisioning timed out after 300s")
    expect(failed!.completed_at).toBeDefined()

    // Verify error is persisted
    const retrieved = getTask(db, "task-fail")!
    expect(retrieved.error).toBe("VM provisioning timed out after 300s")
    expect(retrieved.status).toBe("failed")
  })

  it("tracks multiple tasks with different statuses", () => {
    createTask(db, { id: "t1", source: "manual", repo_url: "r", title: "Task 1" })
    createTask(db, { id: "t2", source: "github", repo_url: "r", title: "Task 2" })
    createTask(db, { id: "t3", source: "manual", repo_url: "r", title: "Task 3" })

    updateTaskStatus(db, "t1", "running")
    updateTaskStatus(db, "t2", "done")
    // t3 stays as "created"

    const t1 = getTask(db, "t1")!
    const t2 = getTask(db, "t2")!
    const t3 = getTask(db, "t3")!

    expect(t1.status).toBe("running")
    expect(t2.status).toBe("done")
    expect(t3.status).toBe("created")
  })

  it("session logs are isolated per task", () => {
    createTask(db, { id: "ta", source: "manual", repo_url: "r", title: "A" })
    createTask(db, { id: "tb", source: "manual", repo_url: "r", title: "B" })

    insertSessionLog(db, { task_id: "ta", role: "user", content: "Log for A" })
    insertSessionLog(db, { task_id: "tb", role: "user", content: "Log for B" })
    insertSessionLog(db, { task_id: "ta", role: "assistant", content: "Reply for A" })

    const logsA = getSessionLogs(db, "ta")
    const logsB = getSessionLogs(db, "tb")

    expect(logsA).toHaveLength(2)
    expect(logsB).toHaveLength(1)
    expect(logsA[0]!.content).toBe("Log for A")
    expect(logsB[0]!.content).toBe("Log for B")
  })
})
