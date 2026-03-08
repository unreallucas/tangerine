import { useState, useEffect, useCallback } from "react"
import { fetchDiff, type DiffData } from "../lib/api"

interface DiffViewProps {
  taskId: string
}

export function DiffView({ taskId }: DiffViewProps) {
  const [diff, setDiff] = useState<DiffData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDiff = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchDiff(taskId)
      setDiff(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diff")
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadDiff()
  }, [loadDiff])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading diff...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-neutral-500">
        <span className="text-red-400">{error}</span>
        <button
          onClick={loadDiff}
          className="rounded px-3 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!diff || diff.files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        No changes yet.
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <span className="text-xs text-neutral-400">
          {diff.files.length} file{diff.files.length !== 1 ? "s" : ""} changed
        </span>
        <button
          onClick={loadDiff}
          className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
        >
          Refresh
        </button>
      </div>

      <div className="divide-y divide-neutral-800">
        {diff.files.map((file) => (
          <div key={file.path}>
            <div className="bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300">
              {file.path}
            </div>
            <pre className="overflow-x-auto p-3 font-mono text-xs leading-5">
              {file.diff.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("+++") || line.startsWith("---")
                      ? "text-neutral-500"
                      : line.startsWith("+")
                        ? "bg-green-950/30 text-green-400"
                        : line.startsWith("-")
                          ? "bg-red-950/30 text-red-400"
                          : line.startsWith("@@")
                            ? "text-blue-400"
                            : "text-neutral-400"
                  }
                >
                  {line}
                </div>
              ))}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
