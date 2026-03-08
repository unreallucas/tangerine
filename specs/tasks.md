# Tasks

Tasks are units of work. Sourced from external issue trackers, not created manually.

## Sources

### GitHub Issues (v0)

Webhook on issue events:
- **Trigger**: issue labeled with configurable label (e.g. `agent`) or assigned to a specific user
- **Payload**: title, body, repo, issue number, author
- **Mapping**: one issue = one task = one VM session

### Linear (future)

Webhook or poll:
- Issue assigned or moved to specific status
- Linear issue ID linked to task

### Manual (fallback)

CLI for testing:
```bash
tangerine task create --repo owner/repo --title "Fix bug" --description "..."
```

## Task Lifecycle

```
created → provisioning → running → done
                                 → failed
         → cancelled (from any non-terminal state)
```

| Status | Description |
|--------|-------------|
| `created` | Task received from webhook, queued |
| `provisioning` | Acquiring VM, cloning, starting OpenCode |
| `running` | Agent session active, accepting prompts |
| `done` | PR created, session ended |
| `failed` | Error during provisioning or execution |
| `cancelled` | User cancelled |

### Transitions

| From | To | Trigger |
|------|----|---------|
| created | provisioning | VM available in pool |
| provisioning | running | OpenCode server healthy, tunnels up |
| provisioning | failed | VM or setup error |
| running | done | User marks done / PR merged |
| running | failed | VM died, unrecoverable error |
| any active | cancelled | User cancels |

## Task Data

### DB Schema

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,           -- github|linear|manual
  source_id TEXT,                 -- github issue number, linear issue ID
  source_url TEXT,                -- link back to issue
  repo_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  vm_id TEXT,
  branch TEXT,
  pr_url TEXT,
  user_id TEXT,                   -- nullable for v0 (multiplayer-ready)
  opencode_session_id TEXT,       -- OpenCode session ID inside VM
  opencode_port INTEGER,          -- local tunneled port for OpenCode API
  preview_port INTEGER,           -- local tunneled port for preview
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);
```

## GitHub Webhook Handler

### Setup

1. Create GitHub webhook on repo (or org-wide)
2. Point to `http://<host>:<port>/webhooks/github`
3. Set secret for signature verification
4. Subscribe to `issues` events

### Processing

```
POST /webhooks/github
  → Verify signature
  → Check event type (issues.labeled, issues.assigned)
  → Check label/assignee matches config
  → Create task
  → Respond 202 Accepted
  → Async: provision VM, start session
```

### Config

```json
{
  "integrations": {
    "github": {
      "webhook_secret": "...",
      "trigger": {
        "type": "label",
        "value": "agent"
      }
    }
  }
}
```

## Task → Branch → PR

1. Task created → branch name: `tangerine/<short-id>` (or from issue: `tangerine/fix-123`)
2. Agent works on branch
3. Agent or system creates PR via `gh pr create`
4. PR URL stored in task record
5. PR linked back to original issue

### PR Attribution

v0: PRs created as the configured GitHub token owner.
Future (hosted): PRs created as the user who triggered the task (GitHub OAuth).

## Concurrency

Multiple tasks can run in parallel (each in its own VM). Dashboard shows all active tasks. Limited by warm pool size.

Queue: if no VMs available, tasks stay in `created` status until a VM is released.
