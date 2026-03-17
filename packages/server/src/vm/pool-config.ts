import type { AppConfig } from "../config.ts"
import type { PoolConfig } from "./pool-types.ts"
import type { Provider } from "./providers/types.ts"
import { goldenVmName } from "../image/build.ts"

/**
 * Creates pool config from app config and a provider instance.
 * Generates one pool slot per project, each using its own golden image.
 * Pool settings (maxPoolSize, minReady, idleTimeoutMs) come from config.json `pool` field.
 */
export function createPoolConfig(config: AppConfig, provider: Provider, providerName: string): PoolConfig {
  const pool = config.config.pool
  const slots = config.config.projects.map((project) => ({
    name: `${providerName}-${project.name}`,
    provider,
    snapshotId: `clone:${goldenVmName(project.image)}`,
    region: "local",
    plan: "4cpu-8gb-20gb",
    maxPoolSize: pool.maxPoolSize,
    priority: 1,
    idleTimeoutMs: pool.idleTimeoutMs,
    minReady: pool.minReady,
  }))

  return {
    slots,
    labelPrefix: "tangerine",
  }
}
