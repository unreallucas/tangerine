# Testing Inside VMs

Agents should verify their work. The golden image includes test tooling; the project config defines how to run tests.

## Approach

The agent runs tests as part of its workflow — not a separate system. OpenCode has shell access inside the VM, so the agent can run whatever test commands the project defines.

## Project Test Config

```json
{
  "test": "npm test && npx playwright test"
}
```

The test command is included in the agent's context so it knows how to verify changes.

## Test Types by Project

### WordPress (wp-env)

```bash
# PHPUnit
npx wp-env run tests-wordpress -- phpunit --filter=TestClassName

# Playwright e2e
npx playwright test

# PHP linting
npx wp-env run cli -- wp eval 'echo "PHP OK";'
```

wp-env runs Docker containers inside the VM. The golden image has Docker pre-installed.

### Node.js / React

```bash
npm test
npx playwright test
npm run lint
npm run typecheck
```

### Generic

Whatever the project's `test` command is. The agent can also discover test commands from `package.json`, `Makefile`, etc.

## Playwright in VMs

Golden images with Playwright should pre-install browsers:

```bash
# In image build script
npx playwright install --with-deps chromium
```

This avoids slow browser downloads at session start.

## Agent Prompting

The project test command is included in the system context:

```
To verify your changes, run: {project.test}
Always run tests before marking work as complete.
```

The agent decides when to run tests (after changes, before creating PR).

## Test Results in Chat

When the agent runs tests via shell, the output appears in the chat stream (via OpenCode's tool call display). Users see pass/fail in real time.

## Future

- Require tests to pass before PR creation (gate)
- Visual regression testing (screenshot comparison)
- Test result summary in PR description
- Coverage reporting
