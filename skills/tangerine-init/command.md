---
description: Set up a project for Tangerine — generate config, build image, and get started
---
Read ~/.claude/skills/tangerine-init/SKILL.md for the full skill instructions, then set up the current project for Tangerine.

**Step 0 — Check registration status first:**
Run `tangerine project list` to see if this project is already registered. If it is, tell the user and ask what they'd like to do (rebuild image, update config, etc.) instead of re-scanning.

If the project is NOT registered, proceed:

Read the reference files before generating:
- ~/.claude/skills/tangerine-init/references/stacks.md — stack detection patterns
- ~/.claude/skills/tangerine-init/templates/build.sh — build script template

Scan the codebase, present your findings and proposed config to the user, then after confirmation:
1. Register the project using `tangerine project add` CLI command
2. Scaffold the build script using `tangerine image init <image-name>`
3. Edit `~/tangerine/images/<image-name>/build.sh` with detected dependencies
4. Guide them through `tangerine image build` and `tangerine start`

$ARGUMENTS
