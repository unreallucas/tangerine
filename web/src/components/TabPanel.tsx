import { useState } from "react"
import type { Task } from "@tangerine/shared"
import { PreviewPanel } from "./PreviewPanel"
import { DiffView } from "./DiffView"
import { InfoPanel } from "./InfoPanel"

type Tab = "preview" | "diff" | "info"

interface TabPanelProps {
  task: Task
}

const tabs: { id: Tab; label: string }[] = [
  { id: "preview", label: "Preview" },
  { id: "diff", label: "Diff" },
  { id: "info", label: "Info" },
]

export function TabPanel({ task }: TabPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("preview")

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 border-b border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm transition ${
              activeTab === tab.id
                ? "border-b-2 border-tangerine text-tangerine"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "preview" && (
          <PreviewPanel taskId={task.id} previewPort={task.previewPort} />
        )}
        {activeTab === "diff" && <DiffView taskId={task.id} />}
        {activeTab === "info" && <InfoPanel task={task} />}
      </div>
    </div>
  )
}
