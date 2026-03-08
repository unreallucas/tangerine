import { describe, test, expect, beforeEach } from "bun:test"
import { Database } from "bun:sqlite"
import { SCHEMA } from "../schema"
import {
  createTask,
  getTask,
  listTasks,
  updateTask,
  updateTaskStatus,
  createVm,
  getVm,
  listVms,
  updateVm,
  updateVmStatus,
  assignVm,
  releaseVm,
  insertSessionLog,
  getSessionLogs,
  createImage,
  getImage,
  listImages,
} from "../queries"

function freshDb(): Database {
  const db = new Database(":memory:")
  db.run("PRAGMA foreign_keys = ON")
  db.exec(SCHEMA)
  return db
}

describe("tasks", () => {
  let db: Database

  beforeEach(() => {
    db = freshDb()
  })

  test("create and retrieve a task", () => {
    const task = createTask(db, {
      id: "task-1",
      source: "manual",
      repo_url: "https://github.com/test/repo",
      title: "Test task",
    })

    expect(task.id).toBe("task-1")
    expect(task.source).toBe("manual")
    expect(task.status).toBe("created")
    expect(task.title).toBe("Test task")

    const retrieved = getTask(db, "task-1")
    expect(retrieved).not.toBeNull()
    expect(retrieved!.id).toBe("task-1")
  })

  test("returns null for non-existent task", () => {
    expect(getTask(db, "nonexistent")).toBeNull()
  })

  test("update task status", () => {
    createTask(db, {
      id: "task-2",
      source: "github",
      repo_url: "https://github.com/test/repo",
      title: "Status test",
    })

    const updated = updateTaskStatus(db, "task-2", "running")
    expect(updated).not.toBeNull()
    expect(updated!.status).toBe("running")
  })

  test("update task fields", () => {
    createTask(db, {
      id: "task-3",
      source: "manual",
      repo_url: "https://github.com/test/repo",
      title: "Update test",
    })

    const updated = updateTask(db, "task-3", {
      branch: "feat/test",
      vm_id: "vm-1",
      error: null,
    })
    expect(updated).not.toBeNull()
    expect(updated!.branch).toBe("feat/test")
    expect(updated!.vm_id).toBe("vm-1")
  })

  test("list tasks by status filter", () => {
    createTask(db, { id: "t-a", source: "manual", repo_url: "r", title: "A" })
    createTask(db, { id: "t-b", source: "manual", repo_url: "r", title: "B" })
    updateTaskStatus(db, "t-b", "running")

    const all = listTasks(db)
    expect(all.length).toBe(2)

    const created = listTasks(db, "created")
    expect(created.length).toBe(1)
    expect(created[0]!.id).toBe("t-a")

    const running = listTasks(db, "running")
    expect(running.length).toBe(1)
    expect(running[0]!.id).toBe("t-b")
  })
})

describe("vms", () => {
  let db: Database

  beforeEach(() => {
    db = freshDb()
  })

  test("create and retrieve a VM", () => {
    const vm = createVm(db, {
      id: "vm-1",
      label: "test-vm",
      provider: "lima",
      snapshot_id: "snap-1",
      region: "local",
      plan: "default",
    })

    expect(vm.id).toBe("vm-1")
    expect(vm.status).toBe("provisioning")
    expect(vm.provider).toBe("lima")

    const retrieved = getVm(db, "vm-1")
    expect(retrieved).not.toBeNull()
    expect(retrieved!.label).toBe("test-vm")
  })

  test("update VM status", () => {
    createVm(db, {
      id: "vm-2",
      label: "vm-two",
      provider: "lima",
      snapshot_id: "snap-1",
      region: "local",
      plan: "default",
    })

    const updated = updateVmStatus(db, "vm-2", "ready")
    expect(updated!.status).toBe("ready")
  })

  test("assign and release VM", () => {
    createTask(db, { id: "task-x", source: "manual", repo_url: "r", title: "X" })
    createVm(db, {
      id: "vm-3",
      label: "vm-three",
      provider: "lima",
      snapshot_id: "snap-1",
      region: "local",
      plan: "default",
      status: "ready",
    })

    const assigned = assignVm(db, "vm-3", "task-x")
    expect(assigned!.status).toBe("assigned")
    expect(assigned!.task_id).toBe("task-x")

    const released = releaseVm(db, "vm-3")
    expect(released!.status).toBe("ready")
    expect(released!.task_id).toBeNull()
    expect(released!.idle_since).not.toBeNull()
  })

  test("list VMs by status", () => {
    createVm(db, { id: "v-a", label: "a", provider: "lima", snapshot_id: "s", region: "local", plan: "default" })
    createVm(db, { id: "v-b", label: "b", provider: "lima", snapshot_id: "s", region: "local", plan: "default" })
    updateVmStatus(db, "v-b", "ready")

    const all = listVms(db)
    expect(all.length).toBe(2)

    const ready = listVms(db, "ready")
    expect(ready.length).toBe(1)
    expect(ready[0]!.id).toBe("v-b")
  })
})

describe("session logs", () => {
  let db: Database

  beforeEach(() => {
    db = freshDb()
  })

  test("insert and retrieve session logs", () => {
    createTask(db, { id: "task-log", source: "manual", repo_url: "r", title: "Log test" })

    insertSessionLog(db, { task_id: "task-log", role: "user", content: "Hello" })
    insertSessionLog(db, { task_id: "task-log", role: "assistant", content: "Hi there" })

    const logs = getSessionLogs(db, "task-log")
    expect(logs.length).toBe(2)
    expect(logs[0]!.role).toBe("user")
    expect(logs[0]!.content).toBe("Hello")
    expect(logs[1]!.role).toBe("assistant")
    expect(logs[1]!.content).toBe("Hi there")
  })

  test("returns empty array for task with no logs", () => {
    createTask(db, { id: "task-empty", source: "manual", repo_url: "r", title: "Empty" })
    const logs = getSessionLogs(db, "task-empty")
    expect(logs.length).toBe(0)
  })
})

describe("images", () => {
  let db: Database

  beforeEach(() => {
    db = freshDb()
  })

  test("create and retrieve images", () => {
    const image = createImage(db, {
      id: "img-1",
      name: "base-debian",
      provider: "lima",
      snapshot_id: "snap-abc",
    })

    expect(image.id).toBe("img-1")
    expect(image.name).toBe("base-debian")

    const retrieved = getImage(db, "img-1")
    expect(retrieved).not.toBeNull()
    expect(retrieved!.snapshot_id).toBe("snap-abc")
  })

  test("list images", () => {
    createImage(db, { id: "i-1", name: "a", provider: "lima", snapshot_id: "s1" })
    createImage(db, { id: "i-2", name: "b", provider: "lima", snapshot_id: "s2" })

    const images = listImages(db)
    expect(images.length).toBe(2)
  })
})
