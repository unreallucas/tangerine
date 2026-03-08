# Architecture

Local background coding agent platform. Agents run in isolated VMs, users interact via web dashboard or terminal. Tasks sourced from GitHub/Linear issues.

## Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Web Dashboard (Vite + React)           │
│  Task list ← GitHub/Linear webhooks                      │
│  Click task → Chat UI (OpenCode SDK) + Preview iframe    │
├──────────────────────────────────────────────────────────┤
│                    API Server (Hono + Bun)                │
│  REST: tasks, sessions, projects                         │
│  WebSocket: real-time chat stream                        │
│  Proxy: preview port forwarding per session              │
│  Webhooks: GitHub issues, Linear (later)                 │
│  Auth: none (v0) → GitHub OAuth + accounts (hosted)      │
├──────────────────────────────────────────────────────────┤
│                    VM Layer (from hal9999)                │
│  Lima/Incus provisioning + warm pool + golden images     │
│  SSH tunnels: OpenCode server + preview port             │
├──────────────────────────────────────────────────────────┤
│                    Inside Each VM                         │
│  opencode serve --port 4096 --hostname 0.0.0.0           │
│  Project dev server on configured preview port           │
│  Git + gh CLI (user's token injected at session start)   │
│  Project-specific tooling (Docker, wp-env, etc.)         │
└──────────────────────────────────────────────────────────┘
```

## Key Principles

- **Project-agnostic**: each project defines its own golden image, setup, preview port, test command
- **One active project at a time**: warm pool serves one project's image
- **Bidirectional agent comms**: OpenCode server mode + SDK, not fire-and-forget
- **Terminal attach**: devs can `opencode attach` from terminal to join any session
- **Multiplayer-ready data model**: session not tied to single user (user_id nullable for v0)
- **Local-first**: runs on your machine, no auth for v0. Upgradeable to hosted with accounts

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Bun | Fast, native TS, same as hal9999 |
| API | Hono | Lightweight, Bun-native WebSocket via `upgradeWebSocket` |
| Frontend | Vite + React | SPA dashboard, fast HMR, clean separation from API |
| Agent | OpenCode (server mode) | Typed SDK, SSE events, bidirectional chat, TUI attach |
| VM | Lima (macOS) / Incus (Linux) | hal9999's battle-tested providers |
| DB | SQLite (bun:sqlite) | Sessions, tasks. Per hal9999 pattern |

## Specs

| Spec | Scope |
|------|-------|
| [project.md](./project.md) | Project config, golden images, setup |
| [vm.md](./vm.md) | VM provisioning, tunnels, warm pool |
| [agent.md](./agent.md) | OpenCode integration, SDK bridge |
| [tasks.md](./tasks.md) | Task lifecycle, webhook sources |
| [api.md](./api.md) | HTTP + WebSocket API surface |
| [web.md](./web.md) | Dashboard UI, chat, preview |
| [credentials.md](./credentials.md) | Auth, token injection, PR creation |
| [testing.md](./testing.md) | E2E testing inside VMs |

## What We Reuse from hal9999

- VM provisioning (Lima/Incus providers, `Provider` interface)
- Golden image build pipeline (`hal image build`)
- Warm pool management (acquire/release/reap idle VMs)
- SSH exec layer (`sshExec`, `sshExecStreaming`, `waitForSsh`)
- DB patterns (VmRow, pool state, SQLite schema)

## What We Don't Reuse

- Fire-and-forget orchestrator (replaced by bidirectional OpenCode SDK)
- Agent presets/wrapper scripts (OpenCode handles agent execution)
- Poll-based output (replaced by SSE streaming)
- hal9999's task manager (replaced by our own with webhook integration)
