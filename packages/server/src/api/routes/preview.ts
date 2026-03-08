import { Hono } from "hono"
import type { AppDeps } from "../app"
import { getTask } from "../../db/queries"

export function previewRoutes(deps: AppDeps): Hono {
  const app = new Hono()

  // Proxy all methods to the task's preview port
  app.all("/:id/*", async (c) => {
    const id = c.req.param("id")
    const task = getTask(deps.db, id)
    if (!task) {
      return c.json({ error: "Task not found" }, 404)
    }
    if (!task.preview_port) {
      return c.json({ error: "No preview available for this task" }, 404)
    }

    // Strip the /preview/:id prefix to get the downstream path
    const url = new URL(c.req.url)
    const prefix = `/preview/${id}`
    const downstreamPath = url.pathname.slice(prefix.length) || "/"
    const target = `http://localhost:${task.preview_port}${downstreamPath}${url.search}`

    const headers = new Headers(c.req.raw.headers)
    headers.set("Host", `localhost:${task.preview_port}`)
    // Remove hop-by-hop headers that shouldn't be forwarded
    headers.delete("connection")
    headers.delete("keep-alive")

    try {
      const response = await fetch(target, {
        method: c.req.method,
        headers,
        body: c.req.method !== "GET" && c.req.method !== "HEAD" ? c.req.raw.body : undefined,
      })

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    } catch {
      return c.json({ error: "Preview service unavailable" }, 502)
    }
  })

  return app
}
