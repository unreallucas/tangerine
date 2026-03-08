export type {
  Provider,
  Instance,
  Snapshot,
  CreateInstanceOptions,
} from "./providers/types.ts";

export { LimaProvider } from "./providers/lima.ts";
export { IncusProvider } from "./providers/incus.ts";
export { createProvider } from "./providers/index.ts";
export type { ProviderType } from "./providers/index.ts";

export { VMPoolManager } from "./pool.ts";
export type { VmRow, VmStatus } from "./pool.ts";
export type { ProviderSlot, PoolConfig } from "./pool-types.ts";

export {
  sshExec,
  sshExecStreaming,
  waitForSsh,
  buildSshArgs,
} from "./ssh.ts";
export type {
  SshExecOptions,
  SshExecResult,
  SshExecStreamingOptions,
} from "./ssh.ts";

export {
  createTunnel,
  destroyTunnel,
  allocatePort,
} from "./tunnel.ts";
export type { SessionTunnel } from "./tunnel.ts";
