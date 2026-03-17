import { useState, useEffect } from "react"
import { fetchDiff, type DiffFile } from "../lib/api"

interface DiffViewProps {
  taskId: string
}

export function DiffView({ taskId }: DiffViewProps) {
  const [files, setFiles] = useState<DiffFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchDiff(taskId)
        if (!cancelled) setFiles(data.files ?? [])
      } catch { /* no diff */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [taskId])

  if (loading) return <div className="p-4 text-center text-[13px] text-[#a3a3a3]">Loading diff...</div>
  if (files.length === 0) return <div className="p-8 text-center text-[13px] text-[#a3a3a3]">No file changes yet</div>

  let totalAdded = 0
  let totalRemoved = 0
  for (const f of files) {
    for (const line of f.diff.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) totalAdded++
      if (line.startsWith("-") && !line.startsWith("---")) totalRemoved++
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-[#e5e5e5] bg-[#f5f5f5] px-4 py-2 text-[12px]">
        <span className="text-green-600">+{totalAdded}</span>
        <span className="text-red-500">-{totalRemoved}</span>
        <span className="text-[#737373]">{files.length} files changed</span>
      </div>
      {files.map((file) => (
        <div key={file.path} className="border-b border-[#e5e5e5]">
          <div className="bg-[#f9fafb] px-4 py-2 font-mono text-[12px] font-medium text-[#0a0a0a]">{file.path}</div>
          <pre className="overflow-x-auto px-4 py-2 font-mono text-[11px] leading-[1.7]">
            {file.diff.split("\n").map((line, i) => {
              const color = line.startsWith("+") ? "text-green-700 bg-green-50"
                : line.startsWith("-") ? "text-red-600 bg-red-50"
                : line.startsWith("@@") ? "text-blue-600"
                : "text-[#737373]"
              return <span key={i} className={`block px-1 ${color}`}>{line}</span>
            })}
          </pre>
        </div>
      ))}
    </div>
  )
}
