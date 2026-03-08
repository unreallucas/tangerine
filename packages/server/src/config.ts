import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { tangerineConfigSchema } from "@tangerine/shared"
import type { TangerineConfig } from "@tangerine/shared"

export interface AppConfig {
  config: TangerineConfig
  credentials: {
    anthropicApiKey: string
    githubToken: string | null
    ghHost: string
  }
}

/** Reads and parses a JSON config file, returning null if it doesn't exist */
function readConfigFile(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null
  const raw = readFileSync(path, "utf-8")
  return JSON.parse(raw) as Record<string, unknown>
}

/**
 * Loads config by merging project-local tangerine.json over global ~/.config/tangerine/config.json,
 * validates with Zod, and resolves credentials from environment variables.
 */
export function loadConfig(): AppConfig {
  const globalPath = join(homedir(), ".config", "tangerine", "config.json")
  const projectPath = join(process.cwd(), "tangerine.json")

  const globalConfig = readConfigFile(globalPath) ?? {}
  const projectConfig = readConfigFile(projectPath) ?? {}

  // Project config overrides global config
  const merged = { ...globalConfig, ...projectConfig }

  const config = tangerineConfigSchema.parse(merged)

  const anthropicApiKey = process.env["ANTHROPIC_API_KEY"]
  if (!anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required")
  }

  return {
    config,
    credentials: {
      anthropicApiKey,
      githubToken: process.env["GITHUB_TOKEN"] ?? null,
      ghHost: process.env["GH_HOST"] ?? "github.com",
    },
  }
}
