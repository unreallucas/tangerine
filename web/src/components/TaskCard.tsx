import { Link } from "react-router-dom"
import type { Task } from "@tangerine/shared"
import { StatusBadge } from "./StatusBadge"
import { timeAgo } from "../lib/time"

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 transition hover:border-neutral-700 hover:bg-neutral-800/50"
    >
      <StatusBadge status={task.status} showLabel={false} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-neutral-100">
            {task.title}
          </span>
          {task.sourceUrl && (
            <a
              href={task.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-xs text-neutral-500 hover:text-tangerine"
            >
              {task.source === "github" ? "GitHub" : task.source}
              {task.sourceId ? ` #${task.sourceId}` : ""}
            </a>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-500">
          <StatusBadge status={task.status} />
          {task.branch && (
            <span className="font-mono text-neutral-500">{task.branch}</span>
          )}
          {task.prUrl && (
            <a
              href={task.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 hover:text-blue-300"
            >
              PR
            </a>
          )}
        </div>
      </div>

      <span className="shrink-0 text-xs text-neutral-500">
        {timeAgo(task.updatedAt)}
      </span>
    </Link>
  )
}
