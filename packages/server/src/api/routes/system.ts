import { Hono } from "hono"
import type { AppDeps } from "../app"

export function systemRoutes(deps: AppDeps): Hono {
  const app = new Hono()

  app.get("/health", (c) => {
    return c.json({ status: "ok", uptime: process.uptime() })
  })

  app.get("/pool", (c) => {
    const stats = deps.pool.getPoolStats()
    return c.json(stats)
  })

  return app
}
