import { useState, useCallback } from "react"

interface PreviewPanelProps {
  taskId: string
  previewPort: number | null
}

export function PreviewPanel({ taskId, previewPort }: PreviewPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  const handleRefresh = useCallback(() => {
    setLoading(true)
    setRefreshKey((k) => k + 1)
  }, [])

  const previewUrl = `/preview/${taskId}/`

  if (!previewPort) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Preview not available. No preview port configured.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <button
          onClick={handleRefresh}
          className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
        >
          Refresh
        </button>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-neutral-500 hover:text-tangerine"
        >
          Open in new tab
        </a>
      </div>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
            <span className="text-sm text-neutral-500">Loading preview...</span>
          </div>
        )}
        <iframe
          key={refreshKey}
          src={previewUrl}
          onLoad={() => setLoading(false)}
          className="h-full w-full border-0 bg-white"
          title="Preview"
        />
      </div>
    </div>
  )
}
