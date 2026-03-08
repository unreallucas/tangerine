import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import type { Task } from "@tangerine/shared"
import { fetchTask } from "../lib/api"
import { useSession } from "../hooks/useSession"
import { ChatPanel } from "../components/ChatPanel"
import { TabPanel } from "../components/TabPanel"
import { StatusBadge } from "../components/StatusBadge"

export function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const session = useSession(id ?? "")

  // Load task details
  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      try {
        const data = await fetchTask(id!)
        if (!cancelled) {
          setTask(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load task")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // Refresh task metadata periodically
    const interval = setInterval(load, 10000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [id])

  // Update task status from WebSocket
  useEffect(() => {
    if (session.taskStatus) {
      setTask((prev) => (prev ? { ...prev, status: session.taskStatus! } : prev))
    }
  }, [session.taskStatus])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading task...
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <span className="text-sm text-red-400">{error ?? "Task not found"}</span>
        <Link to="/" className="text-sm text-tangerine hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Main split view */}
      <div className="flex min-h-0 flex-1">
        {/* Chat panel - 60% */}
        <div className="flex w-[60%] flex-col border-r border-neutral-800">
          <ChatPanel
            messages={session.messages}
            agentStatus={session.agentStatus}
            queueLength={session.queueLength}
            onSend={session.sendPrompt}
            onAbort={session.abort}
          />
        </div>

        {/* Tab panel - 40% */}
        <div className="flex w-[40%] flex-col">
          <TabPanel task={task} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex shrink-0 items-center gap-4 border-t border-neutral-800 bg-neutral-900 px-4 py-2 text-xs">
        <StatusBadge status={task.status} />

        {!session.connected && (
          <span className="text-amber-400">Disconnected</span>
        )}

        {task.branch && (
          <span className="font-mono text-neutral-500">{task.branch}</span>
        )}

        {task.prUrl && (
          <a
            href={task.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            PR
          </a>
        )}

        <Link to="/" className="ml-auto text-neutral-500 hover:text-neutral-300">
          Back
        </Link>
      </div>
    </div>
  )
}
