import { Link } from "react-router-dom"
import type { Task } from "@tangerine/shared"
import { useProject } from "../../context/ProjectContext"
import { useTaskSearch } from "../../hooks/useTaskSearch"

const statusColors: Record<string, string> = {
  running: "#22c55e",
  done: "#a3a3a3",
  completed: "#a3a3a3",
  failed: "#ef4444",
  cancelled: "#a3a3a3",
  created: "#f59e0b",
  provisioning: "#f59e0b",
  queued: "#f59e0b",
}

const statusLabels: Record<string, string> = {
  running: "Running",
  done: "Completed",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  created: "Queued",
  provisioning: "Queued",
}

function formatDuration(task: Task): string {
  const start = task.startedAt ? new Date(task.startedAt).getTime() : new Date(task.createdAt).getTime()
  const end = task.completedAt ? new Date(task.completedAt).getTime() : Date.now()
  const diff = end - start
  const mins = Math.floor(diff / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`
}

function formatDate(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getSourceIcon(source: string) {
  if (source === "github") {
    return (
      <svg className="h-3 w-3 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    )
  }
  return (
    <svg className="h-3 w-3 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
    </svg>
  )
}

export function MobileRuns() {
  const { current } = useProject()
  const { query, setQuery, tasks } = useTaskSearch(current?.name)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-[22px] font-bold text-[#0a0a0a]">Agent Runs</h1>
        <p className="mt-0.5 text-[13px] text-[#a3a3a3]">Monitor and manage run history</p>
      </div>

      {/* Search + New */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2">
          <svg className="h-4 w-4 shrink-0 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search runs..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[#0a0a0a] placeholder-[#a3a3a3] outline-none"
          />
        </div>
        <Link
          to="/new"
          className="flex items-center gap-1.5 rounded-lg bg-[#171717] px-4 py-2.5 text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-[14px] font-medium">Run</span>
        </Link>
      </div>

      {/* Task cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-2.5">
          {tasks.map((task) => {
            const statusColor = statusColors[task.status] ?? "#a3a3a3"
            const statusLabel = statusLabels[task.status] ?? task.status

            return (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="rounded-xl border border-[#e5e5e5] bg-white p-4 transition active:bg-[#fafafa]"
              >
                {/* Title + status */}
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[14px] font-semibold text-[#0a0a0a] leading-tight">{task.title}</span>
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      color: statusColor,
                      backgroundColor: `${statusColor}15`,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Meta row */}
                <div className="mt-2.5 flex items-center gap-3 text-[12px] text-[#737373]">
                  <div className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>{formatDuration(task)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getSourceIcon(task.source)}
                    <span className="capitalize">{task.source === "github" ? "GitHub Push" : task.source}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    <span>{formatDate(task.createdAt)}</span>
                  </div>
                </div>
              </Link>
            )
          })}

          {tasks.length === 0 && (
            <div className="py-16 text-center text-[13px] text-[#a3a3a3]">
              No runs yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
