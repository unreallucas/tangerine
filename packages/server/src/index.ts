import { DEFAULT_API_PORT } from "@tangerine/shared"
import { loadConfig } from "./config"
import { getDb } from "./db/index"
import { VMPoolManager } from "./vm/pool"
import { TaskManager } from "./tasks/manager"
import { createApp } from "./api/app"
import { createGitHubPoller } from "./integrations/github"

const config = loadConfig()
const db = getDb()

// VM pool with empty slots for now — providers are configured per-project
const pool = new VMPoolManager(db, { slots: [] })

const taskManager = new TaskManager(db, pool, config)

const { app, websocket } = createApp({ db, taskManager, pool, config })

// Start GitHub poller if configured
const ghPoller = createGitHubPoller(db, taskManager, config)
if (ghPoller) {
  ghPoller.start()
  console.log("GitHub issue poller started")
}

const server = Bun.serve({
  port: DEFAULT_API_PORT,
  fetch: app.fetch,
  websocket,
})

console.log(`Tangerine API server running on http://localhost:${server.port}`)
