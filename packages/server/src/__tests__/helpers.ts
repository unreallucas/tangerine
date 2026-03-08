import { Database } from "bun:sqlite"
import { SCHEMA } from "../db/schema"
import type { TaskRow } from "../db/types"
import type { Provider, Instance, Snapshot, CreateInstanceOptions } from "../vm/providers/types"
import type { Task, TaskSource } from "@tangerine/shared"

/** Create an in-memory SQLite DB with schema applied */
export function createTestDb(): Database {
  const db = new Database(":memory:")
  db.run("PRAGMA foreign_keys = ON")
  db.exec(SCHEMA)
  return db
}

/** Create a mock Provider that tracks instances in memory */
export function createMockProvider(): Provider & { instances: Map<string, Instance> } {
  const instances = new Map<string, Instance>()

  return {
    instances,

    async createInstance(opts: CreateInstanceOptions): Promise<Instance> {
      const id = opts.label ?? `inst-${Date.now()}`
      const instance: Instance = {
        id,
        label: opts.label ?? id,
        ip: "10.0.0.1",
        status: "active",
        region: opts.region,
        plan: opts.plan,
        snapshotId: opts.snapshotId,
        createdAt: new Date().toISOString(),
        sshPort: 22,
      }
      instances.set(id, instance)
      return instance
    },

    async startInstance(id: string): Promise<void> {
      const inst = instances.get(id)
      if (inst) inst.status = "active"
    },

    async stopInstance(id: string): Promise<void> {
      const inst = instances.get(id)
      if (inst) inst.status = "stopped"
    },

    async destroyInstance(id: string): Promise<void> {
      instances.delete(id)
    },

    async getInstance(id: string): Promise<Instance> {
      const inst = instances.get(id)
      if (!inst) throw new Error(`Instance ${id} not found`)
      return inst
    },

    async listInstances(): Promise<Instance[]> {
      return [...instances.values()]
    },

    async waitForReady(id: string): Promise<Instance> {
      const inst = instances.get(id)
      if (!inst) throw new Error(`Instance ${id} not found`)
      inst.status = "active"
      return inst
    },

    async createSnapshot(_instanceId: string, description: string): Promise<Snapshot> {
      return {
        id: `snap-${Date.now()}`,
        description,
        status: "complete",
        size: 1024,
        createdAt: new Date().toISOString(),
      }
    },

    async listSnapshots(): Promise<Snapshot[]> {
      return []
    },

    async getSnapshot(id: string): Promise<Snapshot> {
      return {
        id,
        description: "test",
        status: "complete",
        size: 1024,
        createdAt: new Date().toISOString(),
      }
    },

    async deleteSnapshot(): Promise<void> {},

    async waitForSnapshot(id: string): Promise<Snapshot> {
      return this.getSnapshot(id)
    },
  }
}

/** Build a Task object (camelCase, matching @tangerine/shared) */
export function makeTask(overrides?: Partial<Task>): Task {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    source: "manual",
    sourceId: null,
    sourceUrl: null,
    repoUrl: "https://github.com/test/repo",
    title: "Test task",
    description: null,
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
    ...overrides,
  }
}
