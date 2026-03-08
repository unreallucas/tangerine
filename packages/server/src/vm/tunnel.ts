import type { Subprocess } from "bun";
import { createServer } from "node:net";

export interface SessionTunnel {
  vmIp: string;
  sshPort: number;
  opencodePort: number;
  previewPort: number;
  process: Subprocess;
}

export async function createTunnel(opts: {
  vmIp: string;
  sshPort: number;
  user?: string;
  remoteOpencodePort?: number;
  remotePreviewPort: number;
}): Promise<SessionTunnel> {
  const user = opts.user ?? "agent";
  const remoteOpencodePort = opts.remoteOpencodePort ?? 4096;

  const [opencodePort, previewPort] = await Promise.all([
    allocatePort(),
    allocatePort(),
  ]);

  const args = [
    "ssh",
    "-N",
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "BatchMode=yes",
    "-o", "LogLevel=ERROR",
    "-o", "ExitOnForwardFailure=yes",
    "-p", String(opts.sshPort),
    // Forward OpenCode port
    "-L", `${opencodePort}:127.0.0.1:${remoteOpencodePort}`,
    // Forward preview port
    "-L", `${previewPort}:127.0.0.1:${opts.remotePreviewPort}`,
    `${user}@${opts.vmIp}`,
  ];

  const process = Bun.spawn(args, {
    stdin: "ignore",
    stdout: "ignore",
    stderr: "pipe",
  });

  // Give the tunnel a moment to establish or fail
  const settled = await Promise.race([
    new Promise<"exited">((resolve) => {
      process.exited.then(() => resolve("exited"));
    }),
    new Promise<"ok">((resolve) => {
      setTimeout(() => resolve("ok"), 2_000);
    }),
  ]);

  if (settled === "exited") {
    const stderr = await new Response(process.stderr).text();
    throw new Error(`SSH tunnel exited immediately: ${stderr}`);
  }

  return {
    vmIp: opts.vmIp,
    sshPort: opts.sshPort,
    opencodePort,
    previewPort,
    process,
  };
}

export function destroyTunnel(tunnel: SessionTunnel): void {
  try {
    tunnel.process.kill();
  } catch {
    // Process may already be dead
  }
}

/** Find a free local port by binding to port 0 and reading the assigned port */
export function allocatePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("Failed to allocate port: unexpected address type"));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}
