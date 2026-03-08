# Project Configuration

Each project defines its own environment. The platform is project-agnostic — WordPress, React, Rails, whatever. One active project at a time.

## Project Config

Stored in `tangerine.json` at the repo root (or `~/.config/tangerine/config.json` for global).

```json
{
  "project": {
    "name": "wordpress-develop",
    "repo": "https://github.com/WordPress/wordpress-develop",
    "default_branch": "trunk",
    "image": "wordpress-dev",
    "setup": "npm install && npx wp-env start",
    "preview": {
      "port": 8888,
      "path": "/"
    },
    "test": "npx wp-env run tests-wordpress phpunit",
    "env": {
      "PHP_VERSION": "8.2"
    }
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Human-readable project name |
| `repo` | string | yes | Repository URL (or `owner/repo` shorthand) |
| `default_branch` | string | no | Default: `main` |
| `image` | string | yes | Golden image name to use |
| `setup` | string | yes | Shell commands to run after clone (start dev server, install deps) |
| `preview.port` | number | no | Port to forward for browser preview |
| `preview.path` | string | no | URL path for preview (default: `/`) |
| `test` | string | no | Command to run tests |
| `env` | object | no | Extra env vars passed to VM |

## Golden Images

Base environments with common tooling pre-installed. Project-specific setup runs on top at session start.

### Image Registry

Images defined in `images/` directory:

```
images/
  wordpress-dev/
    build.sh          # image build script
    packages.txt      # apt packages
  node-dev/
    build.sh
    packages.txt
  fullstack-dev/
    build.sh
    packages.txt
```

### Example Images

**node-dev**: Node.js + npm + Playwright browsers + Git + gh CLI + OpenCode

**wordpress-dev**: node-dev + Docker + Docker Compose + wp-env + PHP + Composer + MariaDB client

**fullstack-dev**: node-dev + Docker + Python + Ruby + Postgres client

### Image Build

```bash
tangerine image build <image-name>
```

Uses hal9999's image build pipeline:
1. Spin up base VM (Debian 13)
2. Run `build.sh` (install packages, tools, OpenCode)
3. Snapshot the VM
4. Future sessions clone from this snapshot

### Image Refresh

Images should be rebuilt periodically to stay current with latest deps. Not automated in v0 — manual `tangerine image build`.

Future: cron-based rebuild (like Ramp's 30-min cycle), versioned images.

## Project Setup Flow

When a session starts for a task:

```
1. Acquire VM from warm pool (uses project's golden image)
2. Clone repo (or git pull if warm VM already has it)
3. Checkout feature branch
4. Run project.setup commands
5. Start opencode serve
6. Establish SSH tunnels (OpenCode API + preview port)
7. Session ready for chat
```

## Multiple Projects

v0: one project configured at a time. Switch by changing `tangerine.json`.

Future: multi-project support, project selector in dashboard, separate warm pools per image.
