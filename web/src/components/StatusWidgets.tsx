import { useState, useEffect, useCallback } from "react"
import type { Task, PoolStats, SystemLogEntry } from "@tangerine/shared"
import { fetchSystemLogs, type VmInfo, type ImageInfo } from "../lib/api"
import { formatRelativeTime } from "../lib/format"

/* ── Status badge ── */

export function StatusBadge({ status }: { status: string }) {
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

export function ActiveRunsCard({ tasks }: { tasks: Task[] }) {
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

export function PoolCard({ pool }: { pool: PoolStats }) {
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

export function ImageCard({ image, projectImage }: { image: ImageInfo | null; projectImage?: string }) {
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

export function VmList({ vms }: { vms: VmInfo[] }) {
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

/* ── Log level badge ── */

function LogLevelBadge({ level }: { level: string }) {
  const styles: Record<string, { color: string; bg: string }> = {
    debug: { color: "var(--color-fg-muted)", bg: "var(--color-surface-secondary)" },
    info:  { color: "var(--color-status-info-text)", bg: "var(--color-status-info-bg)" },
    warn:  { color: "var(--color-status-warning-text)", bg: "var(--color-status-warning-bg)" },
    error: { color: "var(--color-status-error-text)", bg: "var(--color-status-error-bg)" },
  }
  const fallback = { color: "var(--color-status-info-text)", bg: "var(--color-status-info-bg)" }
  const s = styles[level] ?? fallback
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ color: s.color, backgroundColor: s.bg }}>
      {level}
    </span>
  )
}

/* ── Filter pills ── */

const LOG_FILTERS: Array<{ label: string; value: string[] | null; level?: string[] }> = [
  { label: "All", value: null },
  { label: "Pool", value: ["pool", "cli:pool"] },
  { label: "Lifecycle", value: ["lifecycle"] },
  { label: "Image", value: ["cli:image"] },
  { label: "SSH", value: ["ssh"] },
  { label: "Errors", value: null, level: ["error"] },
]

function formatLogTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

/* ── System Log ── */

export function SystemLog() {
  const [logs, setLogs] = useState<SystemLogEntry[]>([])
  const [activeFilter, setActiveFilter] = useState(0)

  const loadLogs = useCallback(async () => {
    const filter = LOG_FILTERS[activeFilter]!
    const params: { level?: string[]; logger?: string[]; limit?: number } = { limit: 200 }
    if (filter.level) params.level = [...filter.level]
    if (filter.value) params.logger = [...filter.value]
    const data = await fetchSystemLogs(params).catch(() => [])
    setLogs(data)
  }, [activeFilter])

  useEffect(() => {
    loadLogs()
    const interval = setInterval(loadLogs, 5000)
    return () => clearInterval(interval)
  }, [loadLogs])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-fg md:text-[16px]">System Log</span>
        <span className="rounded-xl bg-surface-secondary px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted">
          {logs.length} entries
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {LOG_FILTERS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(i)}
            className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
              i === activeFilter
                ? "bg-fg text-bg"
                : "bg-surface-secondary text-fg-muted hover:text-fg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-fg-faint">No system logs yet</div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-edge">
          {/* Desktop: single-row table */}
          <div className="hidden md:block">
            <div className="flex bg-surface-secondary px-3 py-2">
              <span className="w-[160px] text-[12px] font-medium text-fg-muted">Time</span>
              <span className="w-[60px] text-[12px] font-medium text-fg-muted">Level</span>
              <span className="w-[100px] text-[12px] font-medium text-fg-muted">Source</span>
              <span className="flex-1 text-[12px] font-medium text-fg-muted">Message</span>
            </div>
            {logs.map((log) => (
              <div key={log.id} className="flex items-center border-t border-edge px-3 py-2">
                <span className="w-[160px] font-mono text-[11px] text-fg-muted">{formatLogTimestamp(log.timestamp)}</span>
                <div className="w-[60px]"><LogLevelBadge level={log.level} /></div>
                <span className="w-[100px] text-[12px] font-medium text-fg-muted">{log.logger}</span>
                <span className="flex-1 truncate text-[12px] text-fg">{log.message}</span>
              </div>
            ))}
          </div>

          {/* Mobile: two-row cards */}
          <div className="flex flex-col md:hidden">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-0.5 border-b border-edge px-3 py-2 last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-fg-muted">{formatLogTimestamp(log.timestamp)}</span>
                  <LogLevelBadge level={log.level} />
                  <span className="text-[11px] font-medium text-fg-muted">{log.logger}</span>
                </div>
                <span className="text-[12px] text-fg">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
