import { Hono } from "hono"
import type { AppDeps } from "../app"

export function projectRoutes(deps: AppDeps): Hono {
  const app = new Hono()

  app.get("/", (c) => {
    return c.json(deps.config.config.project)
  })

  return app
}
