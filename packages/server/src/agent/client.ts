import { createOpencodeClient } from "@opencode-ai/sdk";

type OpencodeClient = ReturnType<typeof createOpencodeClient>;

/** Per-task OpenCode client instances, keyed by taskId */
const clients = new Map<string, OpencodeClient>();

/**
 * Returns an existing client for a task or creates a new one
 * connected to the tunneled local port.
 */
export function getClient(taskId: string, localPort?: number): OpencodeClient {
  const existing = clients.get(taskId);
  if (existing) return existing;

  if (!localPort) {
    throw new Error(`No client exists for task ${taskId} and no port provided to create one`);
  }

  const client = createOpencodeClient({
    baseUrl: `http://localhost:${localPort}`,
  });

  clients.set(taskId, client);
  return client;
}

/** Remove and clean up a task's client */
export function removeClient(taskId: string): void {
  clients.delete(taskId);
}

/** Check if a client exists for a task */
export function hasClient(taskId: string): boolean {
  return clients.has(taskId);
}
