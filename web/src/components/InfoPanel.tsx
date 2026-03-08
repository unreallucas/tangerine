import type { Task } from "@tangerine/shared"
import { StatusBadge } from "./StatusBadge"

interface InfoPanelProps {
  task: Task
}

function formatDate(date: string | null): string {
  if (!date) return "-"
  return new Date(date).toLocaleString()
}

export function InfoPanel({ task }: InfoPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-4">
        <InfoRow label="Status">
          <StatusBadge status={task.status} />
        </InfoRow>

        <InfoRow label="Source">
          {task.sourceUrl ? (
            <a
              href={task.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {task.source}
              {task.sourceId ? ` #${task.sourceId}` : ""}
            </a>
          ) : (
            <span className="text-sm text-neutral-400">{task.source}</span>
          )}
        </InfoRow>

        <InfoRow label="Branch">
          {task.branch ? (
            <span className="font-mono text-sm text-neutral-300">{task.branch}</span>
          ) : (
            <span className="text-sm text-neutral-500">-</span>
          )}
        </InfoRow>

        <InfoRow label="PR">
          {task.prUrl ? (
            <a
              href={task.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {task.prUrl}
            </a>
          ) : (
            <span className="text-sm text-neutral-500">-</span>
          )}
        </InfoRow>

        <InfoRow label="VM ID">
          <span className="font-mono text-sm text-neutral-400">{task.vmId ?? "-"}</span>
        </InfoRow>

        <InfoRow label="Created">
          <span className="text-sm text-neutral-400">{formatDate(task.createdAt)}</span>
        </InfoRow>

        <InfoRow label="Started">
          <span className="text-sm text-neutral-400">{formatDate(task.startedAt)}</span>
        </InfoRow>

        <InfoRow label="Completed">
          <span className="text-sm text-neutral-400">{formatDate(task.completedAt)}</span>
        </InfoRow>

        {task.error && (
          <InfoRow label="Error">
            <span className="text-sm text-red-400">{task.error}</span>
          </InfoRow>
        )}

        {task.description && (
          <InfoRow label="Description">
            <p className="text-sm text-neutral-400">{task.description}</p>
          </InfoRow>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-neutral-500">{label}</div>
      <div>{children}</div>
    </div>
  )
}
