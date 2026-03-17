import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { Task, PoolStats } from "@tangerine/shared"
import { useProject } from "../context/ProjectContext"
import { useTaskSearch } from "../hooks/useTaskSearch"
import { TasksSidebar } from "../components/TasksSidebar"
import { fetchPool, fetchVms, fetchImages, type VmInfo, type ImageInfo } from "../lib/api"
import { formatRelativeTime } from "../lib/format"

/* ── Status badge ── */

function StatusBadge({ status }: { status: string }) {
  const badges: Record<string, { label: string; color: string; bg: string }> = {
    ready:        { label: "Ready",        color: "var(--color-status-success-text)", bg: "var(--color-status-success-bg)" },
    assigned:     { label: "Assigned",     color: "var(--color-status-info-text)", bg: "var(--color-status-info-bg)" },
    provisioning: { label: "Provisioning", color: "var(--color-status-warning-text)", bg: "var(--color-status-warning-bg)" },
    destroying:   { label: "Destroying",   color: "var(--color-fg-muted)", bg: "var(--color-surface-secondary)" },
    error:        { label: "Error",        color: "var(--color-status-error-text)", bg: "var(--color-status-error-bg)" },
  }
  const b = badges[status] ?? { label: status, color: "var(--color-fg-muted)", bg: "var(--color-surface-secondary)" }
  return (
    <span className="rounded-xl px-2 py-0.5 text-[11px] font-medium" style={{ color: b.color, backgroundColor: b.bg }}>
      {b.label}
    </span>
  )
}

/* ── Cards ── */

function ActiveRunsCard({ tasks }: { tasks: Task[] }) {
  const running = tasks.filter((t) => t.status === "running").length
  const queued = tasks.filter((t) => t.status === "created" || t.status === "provisioning").length
  const done = tasks.filter((t) => t.status === "done").length

  return (
    <div className="flex flex-1 flex-col gap-2.5 rounded-[10px] border border-edge p-3.5 md:gap-3 md:p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-fg-muted">Active Runs</span>
        <span className="rounded-xl bg-status-info-bg px-2.5 py-0.5 text-[11px] font-semibold text-status-info-text">
          {running} Running
        </span>
      </div>
      <div className="flex gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[24px] font-bold text-fg md:text-[28px]">{running}</span>
          <span className="text-[11px] font-medium text-status-info md:text-[12px]">Running</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[24px] font-bold text-fg md:text-[28px]">{queued}</span>
          <span className="text-[11px] font-medium text-status-warning md:text-[12px]">Queued</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[24px] font-bold text-fg md:text-[28px]">{done}</span>
          <span className="text-[11px] font-medium text-status-success md:text-[12px]">Done</span>
        </div>
      </div>
    </div>
  )
}

function PoolCard({ pool }: { pool: PoolStats }) {
  const total = pool.total || 1
  const readyPct = (pool.ready / total) * 100
  const assignedPct = (pool.assigned / total) * 100

  return (
    <div className="flex flex-1 flex-col gap-2.5 rounded-[10px] border border-edge p-3.5 md:gap-3 md:p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-fg-muted">VM Pool</span>
        <span className="rounded-xl bg-status-info-bg px-2.5 py-0.5 text-[11px] font-semibold text-status-info-text">
          {pool.total} / {pool.total + pool.ready}
        </span>
      </div>
      <div className="flex gap-4 md:gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[24px] font-bold text-fg md:text-[28px]">{pool.ready}</span>
          <span className="text-[11px] font-medium text-status-success md:text-[12px]">Ready</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[24px] font-bold text-fg md:text-[28px]">{pool.assigned}</span>
          <span className="text-[11px] font-medium text-status-info md:text-[12px]">Assigned</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[24px] font-bold text-fg md:text-[28px]">{pool.provisioning}</span>
          <span className="text-[11px] font-medium text-status-warning md:text-[12px]">Provisioning</span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
        <div className="flex h-full">
          <div className="h-full bg-status-success" style={{ width: `${readyPct}%` }} />
          <div className="h-full bg-status-info" style={{ width: `${assignedPct}%` }} />
        </div>
      </div>
    </div>
  )
}

function ImageCard({ image, projectImage }: { image: ImageInfo | null; projectImage?: string }) {
  const built = !!image

  return (
    <div className="flex flex-1 flex-col gap-2.5 rounded-[10px] border border-edge p-3.5 md:gap-3 md:p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-fg-muted">Golden Image</span>
        <span
          className="rounded-xl px-2.5 py-0.5 text-[11px] font-semibold"
          style={built
            ? { color: "var(--color-status-success-text)", backgroundColor: "var(--color-status-success-bg)" }
            : { color: "var(--color-status-warning-text)", backgroundColor: "var(--color-status-warning-bg)" }
          }
        >
          {built ? "Built" : "Not Built"}
        </span>
      </div>
      {built ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span className="text-[13px] font-medium text-fg">{image.name}</span>
          </div>
          <span className="text-[12px] text-fg-muted">{image.snapshotId.slice(0, 9)} · {formatRelativeTime(image.createdAt)}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-fg-muted">{projectImage ?? "No image configured"}</span>
          <span className="text-[12px] text-fg-faint">Run: tangerine image build</span>
        </div>
      )}
    </div>
  )
}

/* ── VM Table (desktop) / VM Cards (mobile) ── */

function VmList({ vms }: { vms: VmInfo[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-fg md:text-[16px]">Virtual Machines</span>
        <span className="rounded-xl bg-surface-secondary px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted">
          {vms.length} VMs
        </span>
      </div>

      {vms.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-fg-faint">No VMs in pool</div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-lg border border-edge md:block">
            <div className="flex bg-surface-secondary px-3 py-2.5">
              <span className="w-[180px] text-[12px] font-medium text-fg-muted">ID</span>
              <span className="w-[100px] text-[12px] font-medium text-fg-muted">Status</span>
              <span className="w-[130px] text-[12px] font-medium text-fg-muted">IP</span>
              <span className="w-[200px] text-[12px] font-medium text-fg-muted">Task</span>
              <span className="w-[140px] text-[12px] font-medium text-fg-muted">Created</span>
            </div>
            {vms.map((vm) => (
              <div key={vm.id} className="flex items-center border-t border-edge px-3 py-2.5">
                <span className="w-[180px] font-mono text-[12px] text-fg">{vm.id.slice(0, 12)}</span>
                <div className="w-[100px]"><StatusBadge status={vm.status} /></div>
                <span className="w-[130px] font-mono text-[12px] text-fg">{vm.ip ?? "—"}</span>
                <span className={`w-[200px] text-[13px] ${vm.taskId ? "font-medium text-fg" : "text-fg-muted"}`}>
                  {vm.taskId ?? "—"}
                </span>
                <span className="w-[140px] text-[13px] text-fg-muted">{formatRelativeTime(vm.createdAt)}</span>
              </div>
            ))}
          </div>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {vms.map((vm) => (
              <div key={vm.id} className="flex flex-col gap-1.5 rounded-lg border border-edge p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] text-fg">{vm.id.slice(0, 12)}</span>
                  <StatusBadge status={vm.status} />
                </div>
                <div className="flex gap-3 text-[11px] text-fg-muted">
                  <span className="font-mono">{vm.ip ?? "—"}</span>
                  <span>{vm.taskId ? vm.taskId.slice(0, 12) : "No task"}</span>
                  <span>{formatRelativeTime(vm.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Status Page ── */

export function StatusPage() {
  const navigate = useNavigate()
  const { current } = useProject()
  const { query, setQuery, tasks } = useTaskSearch(current?.name)
  const [pool, setPool] = useState<PoolStats | null>(null)
  const [vms, setVms] = useState<VmInfo[]>([])
  const [images, setImages] = useState<ImageInfo[]>([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [poolData, vmData, imgData] = await Promise.all([
        fetchPool().catch(() => null),
        fetchVms().catch(() => []),
        fetchImages(current?.name).catch(() => []),
      ])
      if (cancelled) return
      if (poolData) setPool(poolData)
      setVms(vmData as VmInfo[])
      setImages(imgData as ImageInfo[])
    }
    load()
    const interval = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [current?.name])

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <TasksSidebar tasks={tasks} searchQuery={query} onSearchChange={setQuery} onNewAgent={() => navigate("/")} />
      </div>

      {/* Main content */}
      <div className="flex h-full w-full flex-col">
        {/* Mobile header */}
        <div className="flex h-[52px] items-center gap-3 border-b border-edge px-4 md:hidden">
          <button onClick={() => navigate("/")} aria-label="Back" className="text-fg">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-[18px] font-semibold text-fg">Status</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Title — desktop only */}
            <div className="hidden flex-col gap-1 md:flex">
              <h1 className="text-[24px] font-semibold text-fg">System Status</h1>
              <p className="text-[14px] text-fg-muted">Infrastructure health for the current project</p>
            </div>

            {/* Cards — horizontal on desktop, stacked on mobile */}
            <div className="flex flex-col gap-4 md:flex-row md:gap-4">
              <ActiveRunsCard tasks={tasks} />
              {pool && <PoolCard pool={pool} />}
              <ImageCard image={images[0] ?? null} projectImage={current?.image} />
            </div>

            {/* VM list */}
            <VmList vms={vms} />
          </div>
        </div>
      </div>
    </div>
  )
}
