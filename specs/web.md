# Web Dashboard

Vite + React SPA. Task list, chat with agent, live preview.

## Pages

### Dashboard (`/`)

Task list — shows all tasks with status, source, title, timestamps.

```
┌─────────────────────────────────────────────────────┐
│  🍊 Tangerine                          [project-name] │
├─────────────────────────────────────────────────────┤
│  ● Running    Fix login validation (#42)    2m ago  │
│  ● Running    Add password reset (#38)      5m ago  │
│  ○ Created    Update footer links (#45)     1m ago  │
│  ✓ Done       Refactor auth module (#36)    1h ago  │
│  ✗ Failed     Add dark mode (#33)           2h ago  │
└─────────────────────────────────────────────────────┘
```

Features:
- Real-time status updates (poll or WebSocket)
- Filter by status
- Click task → task detail view
- Shows source (GitHub issue link)
- Shows PR URL when available

### Task Detail (`/tasks/:id`)

Split view: chat + preview.

```
┌────────────────────────────────┬────────────────────┐
│  Chat                          │  Preview            │
│                                │                     │
│  [Agent] Reading TASK.md...    │  ┌───────────────┐  │
│  [Agent] Installing deps...    │  │               │  │
│  [Agent] Modified login.php    │  │  Live site    │  │
│  [Agent] Running tests... ✓    │  │  (iframe)     │  │
│                                │  │               │  │
│                                │  └───────────────┘  │
│                                │                     │
│  ┌──────────────────────────┐  │  [Diff] [Terminal]  │
│  │ Type a message...    [⏎] │  │                     │
│  └──────────────────────────┘  │                     │
├────────────────────────────────┴────────────────────┤
│  Status: running │ Branch: tangerine/a1b2 │ PR: -   │
└─────────────────────────────────────────────────────┘
```

#### Chat Panel

- Message history (scrollable)
- User messages vs agent responses (different styling)
- Tool call display (file edits, shell commands, results)
- Streaming tokens (live typing effect)
- Input box with send button
- Abort button (visible when agent is working)
- Queue indicator (shows pending prompts)

#### Preview Panel

- iframe loading `http://localhost:<api-port>/preview/<task-id>/`
- Refresh button
- Open in new tab link
- Resizable split

#### Tabs (below preview)

- **Preview** — live site iframe
- **Diff** — file changes (from OpenCode `session.diff()`)
- **Info** — task metadata, source issue link, branch, PR URL

## Components

```
web/src/
  components/
    TaskList.tsx          # dashboard task list
    TaskCard.tsx          # single task row
    ChatPanel.tsx         # message list + input
    ChatMessage.tsx       # single message (user/agent/tool)
    ToolCallDisplay.tsx   # render tool calls (file edit, shell, etc.)
    PreviewPanel.tsx      # iframe + controls
    DiffView.tsx          # file diff display
    StatusBadge.tsx       # colored status indicator
    Layout.tsx            # app shell, nav
  hooks/
    useWebSocket.ts       # WebSocket connection + reconnect
    useTasks.ts           # task list fetching
    useSession.ts         # single task session state
  pages/
    Dashboard.tsx
    TaskDetail.tsx
  lib/
    api.ts                # REST API client
    types.ts              # shared types
  App.tsx
  main.tsx
```

## Real-time Updates

### Dashboard

Poll `GET /api/tasks` every 5s, or upgrade to WebSocket for push updates.

### Task Detail

WebSocket to `WS /api/tasks/:id/ws`:
- Receive agent events (tokens, tool calls, completion)
- Send prompts
- Receive status changes

### Reconnection

WebSocket auto-reconnects on disconnect. Loads message history via REST on reconnect to avoid gaps.

## Styling

v0: minimal, functional. Tailwind CSS or plain CSS modules. Dark theme.

## Dev Setup

```bash
cd web
bun install
bun run dev    # Vite dev server on :5173, proxies /api to :3456
```

Vite config proxies API requests to the Hono server during development.

Production: `bun run build` → static files served by Hono.
