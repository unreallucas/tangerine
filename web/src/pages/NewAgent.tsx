import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useProject } from "../context/ProjectContext"
import { createTask } from "../lib/api"
import { formatModelName } from "../lib/format"

const suggestedTasks = [
  "Fix failing tests",
  "Add API docs",
  "Refactor DB queries",
  "Update deps",
]

export function NewAgent() {
  const navigate = useNavigate()
  const { current, model } = useProject()
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const branch = current?.defaultBranch ?? "main"

  const handleSubmit = useCallback(async () => {
    const trimmed = description.trim()
    if (!trimmed || !current || submitting) return
    setSubmitting(true)
    try {
      const task = await createTask({
        projectId: current.name,
        title: trimmed.slice(0, 80),
        description: trimmed,
      })
      navigate(`/tasks/${task.id}`)
    } catch {
      // TODO: error toast
    } finally {
      setSubmitting(false)
    }
  }, [description, current, submitting, navigate])

  return (
    <div className="flex h-full flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 border-b border-[#e5e5e5] px-4 py-3">
        <button onClick={() => navigate("/")} className="text-[#0a0a0a]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-[16px] font-semibold text-[#0a0a0a]">New Agent</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-6">
        <h1 className="text-[20px] font-bold leading-tight text-[#0a0a0a]">
          What should the agent work on?
        </h1>

        {/* Textarea */}
        <div className="mt-5 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the task or paste an Issue URL..."
            rows={4}
            className="w-full resize-none border-0 bg-transparent px-4 pt-4 pb-3 text-[14px] leading-[1.6] text-[#0a0a0a] placeholder-[#a3a3a3] outline-none"
          />
        </div>

        {/* Branch + Model chips */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5">
            <svg className="h-3.5 w-3.5 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0-12.814a2.25 2.25 0 1 0 0-2.186m0 2.186a2.25 2.25 0 1 0 0 2.186" />
            </svg>
            <span className="text-[13px] text-[#0a0a0a]">{branch}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5">
            <svg className="h-3.5 w-3.5 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <span className="text-[13px] text-[#0a0a0a]">{model ? formatModelName(model) : "claude-4"}</span>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleSubmit}
          disabled={!description.trim() || !current || submitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#171717] py-3.5 text-white transition hover:bg-[#333] disabled:opacity-30"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
          <span className="text-[15px] font-semibold">Start Agent</span>
        </button>

        {/* Suggested tasks */}
        <div className="mt-8">
          <span className="text-[13px] font-medium text-[#a3a3a3]">Suggested tasks</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedTasks.map((task) => (
              <button
                key={task}
                onClick={() => setDescription(task)}
                className="rounded-full border border-[#e5e5e5] bg-white px-3.5 py-2 text-[13px] text-[#0a0a0a] transition active:bg-[#f5f5f5]"
              >
                {task}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="mt-8 pb-8">
          <span className="text-[13px] font-medium text-[#a3a3a3]">Configuration</span>
          <div className="mt-3 flex flex-col gap-1">
            <ToggleRow icon="terminal" label="Terminal access" defaultOn />
            <ToggleRow icon="globe" label="Web access" defaultOn />
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ icon, label, defaultOn }: { icon: string; label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn ?? false)

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {icon === "terminal" ? (
          <svg className="h-4 w-4 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6 0h6.75" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.73-3.558" />
          </svg>
        )}
        <span className="text-[14px] text-[#0a0a0a]">{label}</span>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative h-[28px] w-[48px] rounded-full transition-colors ${on ? "bg-[#171717]" : "bg-[#e5e5e5]"}`}
      >
        <div
          className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-[23px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  )
}
