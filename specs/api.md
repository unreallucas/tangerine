# API

Hono server on Bun. REST + WebSocket + webhook handlers.

## Endpoints

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks (filterable by status) |
| GET | `/api/tasks/:id` | Get task details |
| POST | `/api/tasks` | Create task manually |
| POST | `/api/tasks/:id/cancel` | Cancel a task |
| POST | `/api/tasks/:id/done` | Mark task as done |

### Sessions (proxy to OpenCode)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks/:id/messages` | List messages (proxies to OpenCode SDK) |
| POST | `/api/tasks/:id/prompt` | Send prompt to agent |
| POST | `/api/tasks/:id/abort` | Abort current agent execution |
| GET | `/api/tasks/:id/diff` | Get file changes |

### Preview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/preview/:id/*` | Proxy to task's dev server preview |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/github` | GitHub issue webhook |
| POST | `/webhooks/linear` | Linear webhook (future) |

### Project

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/project` | Get current project config |

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health |
| GET | `/api/pool` | Warm pool status |

## WebSocket

### Connection

```
WS /api/tasks/:id/ws
```

Single WebSocket per task view. Multiplexes:
- Agent output (SSE events from OpenCode, relayed)
- Task status changes
- User prompts (alternative to REST POST)

### Messages (server → client)

```typescript
type WsMessage =
  | { type: "event"; data: OpenCodeEvent }       // SSE event from agent
  | { type: "status"; status: TaskStatus }        // task status change
  | { type: "error"; message: string }            // error
  | { type: "connected" }                         // initial connection ack
```

### Messages (client → server)

```typescript
type WsClientMessage =
  | { type: "prompt"; text: string }              // send prompt to agent
  | { type: "abort" }                             // abort current execution
```

## SSE Bridge

For each running task, the API server:

1. Subscribes to OpenCode's `GET /event` SSE stream (via SDK)
2. Relays events to all connected WebSocket clients for that task
3. Handles reconnection if SSE stream drops

```
OpenCode VM → SSE → API Server → WebSocket → Browser(s)
```

## Preview Proxy

The `/preview/:id/*` endpoint reverse-proxies requests to the task's dev server running inside the VM (via SSH tunnel).

```
Browser iframe → /preview/abc123/wp-admin/
  → API server looks up task abc123's preview port
  → Proxies to http://localhost:<previewPort>/wp-admin/
  → Response back to iframe
```

This avoids exposing raw tunnel ports to the browser and allows cookie/auth handling.

## Error Handling

- Webhook signature verification failures → 401
- Task not found → 404
- VM/agent errors → 500 with error detail
- OpenCode connection lost → WebSocket error event, attempt reconnect

## CORS

v0: same-origin (Vite dev server proxies to API).
Production: API serves static frontend build.
