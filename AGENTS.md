# Tangerine

Local background coding agent platform. VMs + OpenCode + web dashboard.

## Setup

1. Read `specs/architecture.md` and `specs/v0-scope.md`
2. `bun install`
3. `bun run check` before commit

## Structure

```
src/
  api/           # Hono server (REST + WebSocket + webhooks)
  vm/            # VM layer (Lima provider, pool, SSH) — extracted from hal9999
  agent/         # OpenCode SDK bridge
  tasks/         # Task management, lifecycle
  integrations/  # GitHub webhook handler
  db/            # SQLite schema + queries
  image/         # Golden image build scripts
  types.ts
web/
  src/           # Vite + React dashboard
specs/           # Architecture and design docs
```

## Key Decisions

- OpenCode in server mode as agent backend (not fire-and-forget)
- Own chat UI built with OpenCode SDK (not OpenCode's web UI)
- Project-agnostic: each project defines golden image + setup + preview + test
- VM layer extracted from hal9999 (Lima/Incus providers, pool, SSH)
- Multiplayer-ready data model (user_id nullable for v0)
- Local-first, upgradeable to hosted

## Related Projects

- hal9999: `~/workspace/hal9999/` — VM provisioning source
- orange: `~/workspace/orange/` — workflow engine (future integration)
- OpenCode: agent backend (server mode + SDK)

## Rules

- Bun runtime, `bun:test` for tests
- No `any`
- Commits: `type(scope): msg`
- Comments explain "why" not "what"
