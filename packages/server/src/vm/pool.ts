// VM warm pool: pre-provisions VMs from golden image snapshots.
// Logs acquisition, release, and reaping so pool behavior is auditable.

import { Effect } from "effect"
import { createLogger } from "../logger"

/** VmRow for standalone pool functions (camelCase, not the DB snake_case VmRow) */
interface PoolVmRow {
  id: string
  status: string
  taskId: string | null
  idleSince: string | null
  [key: string]: unknown
}

const log = createLogger("pool")

// --- Standalone function API (used by tracer-pool-lifecycle tests) ---

export interface PoolDeps {
  provisionVm(snapshotId: string): Effect.Effect<PoolVmRow, Error>
  destroyVm(vmId: string): Effect.Effect<void, Error>
  getVm(vmId: string): PoolVmRow | undefined
  listVms(filter?: { status?: string }): PoolVmRow[]
  updateVm(vmId: string, updates: Partial<PoolVmRow>): void
}

/** Simple config for standalone pool functions */
export interface SimplePoolConfig {
  minReady: number
  idleTimeoutMs: number
  snapshotId: string
}

export function acquireVm(
  deps: PoolDeps,
  config: { minReady: number; idleTimeoutMs: number; snapshotId: string },
  taskId: string,
): Effect.Effect<PoolVmRow, Error> {
  return Effect.gen(function* () {
    const readyVms = deps.listVms({ status: "ready" })
    let vm: PoolVmRow

    if (readyVms.length > 0) {
      vm = readyVms[0]!
      deps.updateVm(vm.id, {
        status: "assigned",
        taskId,
        idleSince: null,
      })
      log.info("VM acquired", { vmId: vm.id, taskId, fromPool: true })
    } else {
      log.info("No warm VMs, provisioning on demand", { taskId })
      vm = yield* deps.provisionVm(config.snapshotId)
      deps.updateVm(vm.id, { status: "assigned", taskId })
      log.info("VM acquired", { vmId: vm.id, taskId, fromPool: false })
    }

    return vm
  })
}

export function releaseVm(
  deps: PoolDeps,
  vmId: string,
): Effect.Effect<void, Error> {
  return Effect.sync(() => {
    deps.updateVm(vmId, {
      status: "ready",
      taskId: null,
      idleSince: new Date().toISOString(),
    })
    log.info("VM released", { vmId })
  })
}

export function reapIdleVms(
  deps: PoolDeps,
  config: { minReady: number; idleTimeoutMs: number; snapshotId: string },
): Effect.Effect<{ destroyed: number }, Error> {
  return Effect.gen(function* () {
    const readyVms = deps.listVms({ status: "ready" })
    let destroyed = 0

    for (const vm of readyVms) {
      if (!vm.idleSince) continue

      const idleDurationMs = Date.now() - new Date(vm.idleSince).getTime()
      if (idleDurationMs > config.idleTimeoutMs) {
        log.info("VM reaped", { vmId: vm.id, idleDurationMs })
        yield* deps.destroyVm(vm.id)
        deps.updateVm(vm.id, { status: "destroyed" })
        destroyed++
      }
    }

    return { destroyed }
  })
}

export function reconcilePool(
  deps: PoolDeps,
  config: { minReady: number; idleTimeoutMs: number; snapshotId: string },
): Effect.Effect<{ created: number; destroyed: number }, Error> {
  return Effect.gen(function* () {
    const { destroyed } = yield* reapIdleVms(deps, config)

    const readyVms = deps.listVms({ status: "ready" })
    const deficit = config.minReady - readyVms.length
    let created = 0

    if (deficit > 0) {
      log.debug("Warming pool", { current: readyVms.length, target: config.minReady })
      for (let i = 0; i < deficit; i++) {
        yield* deps.provisionVm(config.snapshotId)
        created++
      }
    }

    log.info("Pool reconciled", { created, destroyed })
    return { created, destroyed }
  })
}
