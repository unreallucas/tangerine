// VM warm pool: pre-provisions VMs from golden image snapshots.
// Logs acquisition, release, and reaping so pool behavior is auditable.

import { createLogger } from "../logger"
import type { VmRow } from "../types"

const log = createLogger("pool")

export interface PoolDeps {
  provisionVm(snapshotId: string): Promise<VmRow>
  destroyVm(vmId: string): Promise<void>
  getVm(vmId: string): VmRow | undefined
  listVms(filter?: { status?: string }): VmRow[]
  updateVm(vmId: string, updates: Partial<VmRow>): void
}

export interface PoolConfig {
  minReady: number
  idleTimeoutMs: number
  snapshotId: string
}

export async function acquireVm(
  deps: PoolDeps,
  config: PoolConfig,
  taskId: string,
): Promise<VmRow> {
  // Try to grab an already-warm VM first
  const readyVms = deps.listVms({ status: "ready" })
  let vm: VmRow

  if (readyVms.length > 0) {
    vm = readyVms[0]
    deps.updateVm(vm.id, {
      status: "assigned",
      taskId,
      idleSince: null,
    })
    log.info("VM acquired", { vmId: vm.id, taskId, fromPool: true })
  } else {
    // No warm VMs: provision on demand
    log.info("No warm VMs, provisioning on demand", { taskId })
    vm = await deps.provisionVm(config.snapshotId)
    deps.updateVm(vm.id, { status: "assigned", taskId })
    log.info("VM acquired", { vmId: vm.id, taskId, fromPool: false })
  }

  return vm
}

export async function releaseVm(
  deps: PoolDeps,
  vmId: string,
): Promise<void> {
  deps.updateVm(vmId, {
    status: "ready",
    taskId: null,
    idleSince: new Date().toISOString(),
  })
  log.info("VM released", { vmId })
}

export async function reapIdleVms(
  deps: PoolDeps,
  config: PoolConfig,
): Promise<{ destroyed: number }> {
  const readyVms = deps.listVms({ status: "ready" })
  let destroyed = 0

  for (const vm of readyVms) {
    if (!vm.idleSince) continue

    const idleDurationMs = Date.now() - new Date(vm.idleSince).getTime()
    if (idleDurationMs > config.idleTimeoutMs) {
      log.info("VM reaped", { vmId: vm.id, idleDurationMs })
      await deps.destroyVm(vm.id)
      deps.updateVm(vm.id, { status: "destroyed" })
      destroyed++
    }
  }

  return { destroyed }
}

export async function reconcilePool(
  deps: PoolDeps,
  config: PoolConfig,
): Promise<{ created: number; destroyed: number }> {
  // Reap idle VMs first
  const { destroyed } = await reapIdleVms(deps, config)

  // Top up the pool to minReady
  const readyVms = deps.listVms({ status: "ready" })
  const deficit = config.minReady - readyVms.length
  let created = 0

  if (deficit > 0) {
    log.debug("Warming pool", { current: readyVms.length, target: config.minReady })
    for (let i = 0; i < deficit; i++) {
      await deps.provisionVm(config.snapshotId)
      created++
    }
  }

  log.info("Pool reconciled", { created, destroyed })
  return { created, destroyed }
}
