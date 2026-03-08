import type { AppConfig } from "../config.ts"
import type { PoolConfig } from "./pool-types.ts"
import type { Provider } from "./providers/types.ts"
import {
  DEFAULT_IDLE_TIMEOUT_MS,
  DEFAULT_MIN_READY,
  DEFAULT_MAX_POOL_SIZE,
} from "@tangerine/shared"

/**
 * Creates a pool config from the app config and a provider instance.
 * Defaults are tuned for an M4 Max 48GB: 4 CPU, 8 GiB RAM, 20 GiB disk per VM.
 */
export function createPoolConfig(config: AppConfig, provider: Provider, providerName: string): PoolConfig {
  const imageName = config.config.project.image

  return {
    slots: [
      {
        name: providerName,
        provider,
        snapshotId: imageName,
        region: "local",
        plan: "4cpu-8gb-20gb",
        maxPoolSize: DEFAULT_MAX_POOL_SIZE,
        priority: 1,
        idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
        minReady: DEFAULT_MIN_READY,
      },
    ],
    labelPrefix: "tangerine",
  }
}
