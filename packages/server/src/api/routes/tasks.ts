import { Hono } from "hono"
import type { AppDeps } from "../app"
import { mapTaskRow } from "../helpers"
import { getTask, listTasks } from "../../db/queries"

export function taskRoutes(deps: AppDeps): Hono {
  const app = new Hono()

  app.get("/", (c) => {
    const status = c.req.query("status")
    const rows = listTasks(deps.db, status)
    return c.json(rows.map(mapTaskRow))
  })

  app.get("/:id", (c) => {
    const row = getTask(deps.db, c.req.param("id"))
    if (!row) {
      return c.json({ error: "Task not found" }, 404)
    }
    return c.json(mapTaskRow(row))
  })

  app.post("/", async (c) => {
    const body = await c.req.json<{ repoUrl?: string; title?: string; description?: string }>()
    if (!body.repoUrl || !body.title) {
      return c.json({ error: "repoUrl and title are required" }, 400)
    }
    const row = await deps.taskManager.createTask("manual", body.repoUrl, body.title, body.description)
    return c.json(mapTaskRow(row), 201)
  })

  app.post("/:id/cancel", async (c) => {
    const id = c.req.param("id")
    const row = getTask(deps.db, id)
    if (!row) {
      return c.json({ error: "Task not found" }, 404)
    }
    await deps.taskManager.cancelTask(id)
    const updated = getTask(deps.db, id)!
    return c.json(mapTaskRow(updated))
  })

  app.post("/:id/done", async (c) => {
    const id = c.req.param("id")
    const row = getTask(deps.db, id)
    if (!row) {
      return c.json({ error: "Task not found" }, 404)
    }
    await deps.taskManager.completeTask(id)
    const updated = getTask(deps.db, id)!
    return c.json(mapTaskRow(updated))
  })

  return app
}
