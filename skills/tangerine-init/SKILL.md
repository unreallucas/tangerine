---
name: tangerine-init
description: Set up a project for Tangerine — analyze the codebase, generate configuration, and guide the user through building images and running the platform.
metadata:
  author: tung
  version: "0.3.0"
---

# Tangerine Init Skill

Set up a project to run on the Tangerine coding agent platform. Generates configuration, then guides the user through the full workflow.

## What You Generate

1. **`.tangerine/config.json`** — project config (repo, image name, setup commands, preview port, test command, env vars)
2. **`.tangerine/build.sh`** — golden image build script (apt packages, runtimes, tools installed on top of Debian 13 base)

## Workflow

1. **Scan the codebase** for stack indicators (see references/stacks.md)
2. **Detect**:
   - Language runtimes and versions
   - Package managers
   - Frameworks and their dev server ports
   - Database/service dependencies
   - Test runners and commands
   - Docker/container usage
   - CI config (often reveals required tooling)
3. **Read the templates** before generating:
   - `~/.claude/skills/tangerine-init/templates/config.json` for config structure
   - `~/.claude/skills/tangerine-init/templates/build.sh` for build script structure
4. **Present the plan** to the user before writing:
   - Detected stack summary
   - Proposed image name
   - What goes in `build.sh` vs what goes in `config.json` setup
   - Preview port and test command
5. **Write files** after user confirms

## Key Principles

### build.sh vs setup command

- **`build.sh`** (baked into image): runtimes, system packages, global tools, browser binaries — things that are slow to install and shared across sessions
- **`setup`** (runs each session): `npm install`, `composer install`, starting dev servers — project-specific, changes with each branch

### Base Image Includes

The Debian 13 base VM already has these — do NOT add them to build.sh:
- git, curl, wget, jq, build-essential, openssh-server
- Node.js (via nvm), npm
- OpenCode (pre-installed)
- gh CLI
- ripgrep, fd-find
- Docker + Docker Compose

### Image Naming

Use descriptive kebab-case: `node-dev`, `wordpress-dev`, `python-django-dev`, `rails-dev`, `fullstack-dev`

Check if `.tangerine/build.sh` already exists in the project before creating a new one.

### Preview Port

- Next.js / Vite / CRA: 3000 or 5173
- WordPress (wp-env): 8888
- Rails: 3000
- Django: 8000
- Phoenix: 4000
- Look for port config in package.json scripts, docker-compose, framework config

### Extra Ports

If the project needs additional forwarded ports (database UIs, API servers, etc.), add them to config.json under `ports`.

## File Locations

Everything lives in `.tangerine/` at the project root:

```
my-app/
  .tangerine/
    config.json           # project config
    build.sh              # golden image build script
```

- Write `.tangerine/config.json` to the project root (cwd)
- Write `.tangerine/build.sh` to the project root (cwd)

## What to Ask the User

Only ask if you genuinely can't determine from the codebase:
- Which repo URL to use (if no git remote found)
- Preview port (if ambiguous — multiple possible dev servers)

## After Init: Using Tangerine

After writing the config files, guide the user through the next steps.

### Prerequisites

- **Bun** installed
- **Lima** installed (`brew install lima` on macOS)
- **tangerine** CLI available globally (`bun link` from the tangerine repo, or `npm i -g tangerine`)
- **LLM credentials**: either run `opencode auth login` or set `ANTHROPIC_API_KEY` env var
- **GitHub token**: set `GITHUB_TOKEN` env var (for PR creation and repo cloning)

### First-time Setup

```bash
# 1. Build the golden image (runs .tangerine/build.sh inside a fresh VM, snapshots it)
tangerine image build

# 2. Start the server + web dashboard (run from the project directory)
tangerine start
```

### Day-to-day Usage

```bash
# Start tangerine from the project directory
tangerine start

# The web dashboard opens at http://localhost:3456
# - View tasks (sourced from GitHub issues or created manually)
# - Click a task to open the chat UI + live preview
# - The agent runs in an isolated VM with full access to the project

# Create tasks manually
tangerine task create --repo owner/repo --title "Fix bug"

# Check warm pool status
tangerine pool status

# Rebuild the image when project dependencies change
tangerine image build
```

### How It Works

1. **Task created** (from GitHub webhook or manually)
2. **VM acquired** from warm pool (cloned from golden image snapshot)
3. **Repo cloned** + feature branch created inside VM
4. **Credentials injected** (OpenCode auth + GitHub token)
5. **OpenCode agent starts** inside VM, accessible via SSH tunnel
6. **User chats** with the agent through the web dashboard
7. **Agent works** — edits code, runs tests, creates PRs
8. **VM released** back to pool when task completes

### Key Concepts

- **Golden image**: a VM snapshot with your project's runtimes and tools pre-installed (built from `.tangerine/build.sh`). Rebuild when deps change.
- **Warm pool**: pre-provisioned VMs ready to go, so tasks start instantly instead of waiting for a VM to boot.
- **One project at a time**: tangerine reads config from cwd. To switch projects, stop and restart from the other project dir.
- **Terminal attach**: devs can join any running session from terminal with `opencode attach`.
