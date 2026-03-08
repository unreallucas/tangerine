export { getClient, removeClient, hasClient } from "./client.ts";
export {
  subscribeToTask,
  unsubscribeFromTask,
  addListener,
  removeListener,
} from "./events.ts";
export {
  enqueue,
  handleAgentEvent,
  getQueueLength,
  getAgentState,
  clear as clearQueue,
} from "./prompt-queue.ts";
export type {
  AgentState,
  EventListener,
  OpenCodeEvent,
  EventSubscription,
  QueuedPrompt,
} from "./types.ts";
