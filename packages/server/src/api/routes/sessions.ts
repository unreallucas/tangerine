import { Hono } from "hono"
import type { AppDeps } from "../app"
import { getTask, getSessionLogs } from "../../db/queries"

export function sessionRoutes(deps: AppDeps): Hono {
  const app = new Hono()

  app.get("/:id/messages", (c) => {
    const id = c.req.param("id")
    const task = getTask(deps.db, id)
    if (!task) {
      return c.json({ error: "Task not found" }, 404)
    }
    const logs = getSessionLogs(deps.db, id)
    return c.json(logs)
  })

  app.post("/:id/prompt", async (c) => {
    const id = c.req.param("id")
    const task = getTask(deps.db, id)
    if (!task) {
      return c.json({ error: "Task not found" }, 404)
    }
    const body = await c.req.json<{ text?: string }>()
    if (!body.text) {
      return c.json({ error: "text is required" }, 400)
    }
    deps.taskManager.sendPrompt(id, body.text)
    return c.json({ ok: true })
  })

  app.post("/:id/abort", async (c) => {
    const id = c.req.param("id")
    const task = getTask(deps.db, id)
    if (!task) {
      return c.json({ error: "Task not found" }, 404)
    }
    await deps.taskManager.abortTask(id)
    return c.json({ ok: true })
  })

  app.get("/:id/diff", (c) => {
    const id = c.req.param("id")
    const task = getTask(deps.db, id)
    if (!task) {
      return c.json({ error: "Task not found" }, 404)
    }
    // Placeholder: real implementation requires OpenCode client
    return c.json({ taskId: id, diff: "" })
  })

  return app
}
