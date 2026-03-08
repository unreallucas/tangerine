// GitHub integration: polls for issues matching trigger criteria.
// Logs polling results and skipped duplicates for debugging issue ingestion.

import { createLogger } from "../logger"
import type { ProjectConfig } from "../types"

const log = createLogger("github")

export interface GitHubDeps {
  createTask(params: {
    source: "github"
    sourceId: string
    sourceUrl: string
    repoUrl: string
    title: string
    description: string
  }): void
  isTaskExists(sourceId: string): boolean
}

interface GitHubIssue {
  number: number
  title: string
  body: string | null
  html_url: string
  labels: Array<{ name: string }>
  assignee: { login: string } | null
}

export async function pollGitHubIssues(
  config: ProjectConfig,
  deps: GitHubDeps,
): Promise<void> {
  const trigger = config.integrations?.github?.trigger
  if (!trigger) return

  const repo = config.repo
  log.debug("Polling GitHub", { repo, trigger: `${trigger.type}:${trigger.value}` })

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open&per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      },
    )

    if (!response.ok) {
      log.error("Poll error", { statusCode: response.status, message: response.statusText, repo })
      return
    }

    const issues: GitHubIssue[] = await response.json()

    // Filter issues that match the configured trigger
    const matching = issues.filter((issue) => {
      if (trigger.type === "label") {
        return issue.labels.some((l) => l.name === trigger.value)
      }
      if (trigger.type === "assignee") {
        return issue.assignee?.login === trigger.value
      }
      return false
    })

    if (matching.length > 0) {
      log.info("Found new issues", { count: matching.length, repo })
    }

    for (const issue of matching) {
      const sourceId = `github:${repo}#${issue.number}`

      if (deps.isTaskExists(sourceId)) {
        log.debug("Issue skipped (duplicate)", { issueNumber: issue.number, repo })
        continue
      }

      deps.createTask({
        source: "github",
        sourceId,
        sourceUrl: issue.html_url,
        repoUrl: `https://github.com/${repo}.git`,
        title: issue.title,
        description: issue.body ?? "",
      })
    }
  } catch (err) {
    log.error("Poll error", {
      repo,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  // HMAC-SHA256 verification for GitHub webhook payloads
  const hmac = new Bun.CryptoHasher("sha256", secret)
  hmac.update(payload)
  const expected = `sha256=${hmac.digest("hex")}`

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}
