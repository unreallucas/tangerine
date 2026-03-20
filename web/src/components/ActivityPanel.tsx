import { useEffect, useState } from "react"
import type { ActivityEntry } from "@tangerine/shared"
import type { DiffFile } from "../lib/api"
import { fetchActivities } from "../lib/api"
import { ActivityList } from "./ActivityList"
import { ChangesPanel, type DiffComment } from "./ChangesPanel"

export type PanelTab = "activities" | "changes"

interface ActivityPanelProps {
  taskId: string
  diffFiles: DiffFile[]
  activeTab: PanelTab
  onTabChange: (tab: PanelTab) => void
  onCollapse?: () => void
  onScrollToFile?: (path: string) => void
  onSendComments?: (comments: DiffComment[]) => void
}

export function ActivityPanel({ taskId, diffFiles, activeTab, onTabChange, onCollapse, onScrollToFile, onSendComments }: ActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchActivities(taskId)
        if (!cancelled) setActivities(data)
      } catch {
        // Activities may not be available
      }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [taskId])

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l border-edge bg-surface-secondary">
      {/* Panel header */}
      <div className="flex h-11 items-center justify-between border-b border-edge bg-surface px-4">
        <div className="flex items-center gap-0.5" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "activities"}
            onClick={() => onTabChange("activities")}
            className={`rounded-sm px-3 py-1.5 text-[13px] font-medium ${
              activeTab === "activities"
                ? "bg-surface text-fg shadow-sm"
                : "text-fg-muted"
            }`}
          >
            Activities
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "changes"}
            onClick={() => onTabChange("changes")}
            className={`rounded-sm px-3 py-1.5 text-[13px] font-medium ${
              activeTab === "changes"
                ? "bg-surface text-fg shadow-sm"
                : "text-fg-muted"
            }`}
          >
            Changes
            {diffFiles.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-fg px-1 text-[10px] font-semibold text-surface">
                {diffFiles.length}
              </span>
            )}
          </button>
        </div>
        {onCollapse && (
          <button onClick={onCollapse} aria-label="Collapse panel" className="text-fg-muted hover:text-fg">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1">
        {activeTab === "activities" ? (
          <div className="h-full overflow-y-auto px-4 pt-3">
            <ActivityList activities={activities} variant="compact" />
          </div>
        ) : (
          <ChangesPanel
            files={diffFiles}
            onScrollToFile={onScrollToFile}
            onSendComments={onSendComments}
          />
        )}
      </div>
    </div>
  )
}
