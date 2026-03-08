# Credentials

How API keys and tokens flow from host to VM. Never baked into images.

## Credential Types

| Credential | Purpose | Source |
|------------|---------|--------|
| `ANTHROPIC_API_KEY` | OpenCode → Claude API | Server config / env |
| `GITHUB_TOKEN` | git push, `gh pr create` | Static PAT (v0) / User OAuth (hosted) |
| `GH_HOST` | GitHub Enterprise | Server config |
| `OPENCODE_SERVER_PASSWORD` | Protect OpenCode API in VM | Generated per session |

## Injection Flow

```
1. Session starts → API server reads credentials from config/env
2. SSH into VM
3. Write credentials to temp file
4. Source into environment
5. Delete temp file
6. Start opencode serve with credentials in env
```

Reuses hal9999's credential scrubbing pattern:

```bash
_CREDS=$(mktemp)
cat > "$_CREDS" <<'EOF'
export ANTHROPIC_API_KEY='sk-...'
export GITHUB_TOKEN='ghp_...'
export GH_TOKEN='ghp_...'
EOF
source "$_CREDS"
rm -f "$_CREDS"
```

## Git Authentication

Inside VM:

```bash
git config --global credential.helper store
echo 'https://x-access-token:<GITHUB_TOKEN>@github.com' > ~/.git-credentials
chmod 600 ~/.git-credentials
```

For GitHub Enterprise:
```bash
echo 'https://x-access-token:<TOKEN>@github.mycompany.com' >> ~/.git-credentials
git config --global "url.https://github.mycompany.com/.insteadOf" "git@github.mycompany.com:"
```

## PR Creation

Agent uses `gh` CLI inside VM:

```bash
gh pr create --base main --head tangerine/abc123 --fill
```

`GH_TOKEN` and `GH_HOST` (if GHE) are in the environment.

### Attribution

v0: PRs authored by whoever owns the `GITHUB_TOKEN` (static PAT).

Future (hosted):
- User logs in via GitHub OAuth
- Their token stored server-side per user
- Injected into VM for their tasks
- PRs show up as the actual user

## Credential Storage (v0)

Simple: `.env` file or environment variables on the host.

```env
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
GH_HOST=github.com
```

Future (hosted): encrypted credential store per user, similar to hal9999's auth module (Keychain / Secret Service / encrypted file).

## VM Credential Cleanup

On session end / VM release:
1. Unset env vars
2. Remove `~/.git-credentials`
3. Remove any OpenCode auth state
4. VM returned to warm pool clean

## Security Notes

- Credentials exist in VM memory during session — acceptable for local VMs
- SSH tunnel means OpenCode API is not exposed on network (only localhost)
- `OPENCODE_SERVER_PASSWORD` adds a layer even if tunnel leaks
- Golden images never contain credentials
- Credential injection happens per-session, not at image build time
