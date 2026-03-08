// Hono API server: REST + WebSocket + webhook handlers.
// Error handler logs structured context for debugging API failures.

import { Hono } from "hono"
import { logger as honoLogger } from "hono/logger"
import { createLogger } from "../logger"

const log = createLogger("api")

export function createApp(): Hono {
  const app = new Hono()

  // Hono's built-in request logger for HTTP access logs
  app.use("*", honoLogger())

  // Health check
  app.get("/api/health", (c) => c.json({ status: "ok" }))

  // Tasks CRUD
  app.get("/api/tasks", (c) => {
    // TODO: wire to task manager
    return c.json({ tasks: [] })
  })

  app.get("/api/tasks/:id", (c) => {
    const _id = c.req.param("id")
    // TODO: wire to task manager
    return c.json({ error: "not implemented" }, 501)
  })

  app.post("/api/tasks", async (c) => {
    // TODO: wire to task manager
    return c.json({ error: "not implemented" }, 501)
  })

  app.post("/api/tasks/:id/cancel", async (c) => {
    const _id = c.req.param("id")
    // TODO: wire to task manager
    return c.json({ error: "not implemented" }, 501)
  })

  app.post("/api/tasks/:id/prompt", async (c) => {
    const _id = c.req.param("id")
    // TODO: wire to prompt queue
    return c.json({ error: "not implemented" }, 501)
  })

  app.post("/api/tasks/:id/abort", async (c) => {
    const _id = c.req.param("id")
    // TODO: wire to agent abort
    return c.json({ error: "not implemented" }, 501)
  })

  // Webhook endpoint
  app.post("/webhooks/github", async (c) => {
    // TODO: wire to github integration
    return c.json({ received: true }, 202)
  })

  // Global error handler — structured logging for all unhandled errors
  app.onError((err, c) => {
    log.error("Unhandled API error", {
      method: c.req.method,
      path: c.req.path,
      error: err.message,
      stack: err.stack?.split("\n").slice(0, 5).join("\n"),
    })
    return c.json({ error: "Internal server error" }, 500)
  })

  return app
}
