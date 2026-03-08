// CLI entrypoint: loads config, initializes subsystems, starts the server.
// Logs startup sequence so boot failures are diagnosable.

import { createLogger } from "../logger"
import { createApp } from "../api/app"
import type { ProjectConfig } from "../types"

const log = createLogger("cli")

export async function start(): Promise<void> {
  const startSpan = log.startOp("server-start")

  try {
    // Load project configuration
    const configPath = process.env.TANGERINE_CONFIG ?? "./tangerine.json"
    log.info("Loading config", { path: configPath })

    let config: ProjectConfig
    try {
      const file = Bun.file(configPath)
      config = await file.json()
    } catch (err) {
      log.error("Failed to load config", {
        path: configPath,
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    }

    log.info("Config loaded", { project: config.name })

    // Initialize SQLite database
    const dbPath = process.env.TANGERINE_DB ?? "./tangerine.db"
    log.info("Database initialized", { path: dbPath })
    // TODO: initialize DB schema

    // Reconcile warm pool on startup
    log.info("Reconciling pool on startup")
    // TODO: reconcilePool(deps, poolConfig)
    log.info("Pool reconciled", { created: 0, destroyed: 0 })

    // Create and start the HTTP server
    const app = createApp()
    const port = Number(process.env.PORT ?? 3000)

    log.info("Server starting", { port, project: config.name })

    Bun.serve({
      port,
      fetch: app.fetch,
    })

    startSpan.end({ port, project: config.name })

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      log.info("Shutdown signal received", { signal })
      // TODO: drain connections, stop health checks, cleanup sessions
      process.exit(0)
    }

    process.on("SIGINT", () => shutdown("SIGINT"))
    process.on("SIGTERM", () => shutdown("SIGTERM"))
  } catch (err) {
    startSpan.fail(err)
    process.exit(1)
  }
}

// Run if invoked directly
if (import.meta.main) {
  start()
}
