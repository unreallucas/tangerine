import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import type { Task, ActivityEntry } from "@tangerine/shared"
import { fetchTask, fetchActivities } from "../lib/api"
import { getStatusConfig } from "../lib/status"
import { useSession } from "../hooks/useSession"
import { useTaskSearch } from "../hooks/useTaskSearch"
import { useProject } from "../context/ProjectContext"
import { useDiffFiles } from "../hooks/useDiffFiles"
import { TasksSidebar } from "../components/TasksSidebar"
import { ChatPanel } from "../components/ChatPanel"
import { ActivityPanel, type PanelTab } from "../components/ActivityPanel"
import { DiffView } from "../components/DiffView"
import { ActivityList } from "../components/ActivityList"
import type { DiffComment } from "../components/ChangesPanel"

type MobileTab = "chat" | "changes" | "activities"

export function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [showActivity, setShowActivity] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>("activities")
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat")

  const { current } = useProject()
  const session = useSession(id ?? "")
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const { query, setQuery, tasks } = useTaskSearch(current?.name)
  const { files: diffFiles } = useDiffFiles(id ?? "")

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      try {
        const data = await fetchTask(id!)
        if (!cancelled) setTask(data)
      } catch {
        // task not found
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      try {
        const data = await fetchActivities(id!)
        if (!cancelled) setActivities(data)
      } catch { /* ignore */ }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [id])

  useEffect(() => {
    if (session.taskStatus) {
      setTask((prev) => (prev ? { ...prev, status: session.taskStatus! } : prev))
    }
  }, [session.taskStatus])

  const handleScrollToFile = useCallback((path: string) => {
    const el = document.getElementById(`diff-file-${path}`)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const handleSendComments = useCallback((comments: DiffComment[]) => {
    const text = comments
      .map((c) => `[${c.filePath}:${c.lineRef}] ${c.text}`)
      .join("\n\n")
    session.sendPrompt(text)
  }, [session])

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="hidden md:block">
          <TasksSidebar tasks={tasks} searchQuery={query} onSearchChange={setQuery} onNewAgent={() => navigate("/")} />
        </div>
        <div className="flex flex-1 items-center justify-center text-[13px] text-fg-muted">
          Loading...
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex h-full">
        <div className="hidden md:block">
          <TasksSidebar tasks={tasks} searchQuery={query} onSearchChange={setQuery} onNewAgent={() => navigate("/")} />
        </div>
        <div className="flex flex-1 items-center justify-center text-[13px] text-fg-muted">
          Task not found
        </div>
      </div>
    )
  }

  const { color: statusColor, label: statusLabel } = getStatusConfig(task.status)

  return (
    <div className="flex h-full">
      {/* Desktop layout */}
      <div className="hidden h-full w-full md:flex">
        <TasksSidebar tasks={tasks} searchQuery={query} onSearchChange={setQuery} onNewAgent={() => navigate("/")} />
        <div className="flex min-w-0 flex-1 flex-col">
          {panelTab === "changes" && diffFiles.length > 0 ? (
            <DiffView files={diffFiles} />
          ) : (
            <ChatPanel
              messages={session.messages}
              agentStatus={session.agentStatus}
              queueLength={session.queueLength}
              taskTitle={task.title}
              branch={task.branch ?? undefined}
              prUrl={task.prUrl ?? undefined}
              model={task.model}
              onSend={session.sendPrompt}
              onAbort={session.abort}
              onToggleActivity={() => setShowActivity(!showActivity)}
              showActivityToggle
            />
          )}
        </div>
        {showActivity && (
          <ActivityPanel
            taskId={id!}
            diffFiles={diffFiles}
            activeTab={panelTab}
            onTabChange={setPanelTab}
            onCollapse={() => setShowActivity(false)}
            onScrollToFile={handleScrollToFile}
            onSendComments={handleSendComments}
          />
        )}
      </div>

      {/* Mobile layout */}
      <div className="flex h-full w-full flex-col md:hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-edge bg-white px-4 py-2.5">
          <button onClick={() => navigate("/")} aria-label="Back to runs" className="text-fg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{task.title}</span>
          <span className="shrink-0 text-[12px]" style={{ color: statusColor }}>{statusLabel}</span>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-1 border-b border-edge bg-surface-secondary px-3 py-1" role="tablist">
          {(["chat", "changes", "activities"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={mobileTab === t}
              onClick={() => setMobileTab(t)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                mobileTab === t ? "bg-white text-fg shadow-sm" : "text-fg-muted"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-0 flex-1">
          {mobileTab === "chat" && (
            <ChatPanel
              messages={session.messages}
              agentStatus={session.agentStatus}
              queueLength={session.queueLength}
              onSend={session.sendPrompt}
              onAbort={session.abort}
            />
          )}
          {mobileTab === "changes" && <DiffView files={diffFiles} />}
          {mobileTab === "activities" && <ActivityList activities={activities} variant="timeline" />}
        </div>
      </div>
    </div>
  )
}
