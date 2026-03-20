import { useState, useMemo } from "react"
import type { DiffFile } from "../lib/api"

type ViewMode = "split" | "unified"

interface SplitLine {
  left: { num: number; content: string; type: "remove" | "context" } | null
  right: { num: number; content: string; type: "add" | "context" } | null
}

export function getFileStats(diff: string) {
  let added = 0
  let removed = 0
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) added++
    if (line.startsWith("-") && !line.startsWith("---")) removed++
  }
  return { added, removed }
}

export function fileName(path: string): string {
  return path.split("/").pop() ?? path
}

export function fileDir(path: string): string {
  const parts = path.split("/")
  return parts.length > 1 ? parts.slice(0, -1).join("/") : ""
}

function parseSplitLines(diff: string): SplitLine[] {
  const rawLines = diff.split("\n")
  const result: SplitLine[] = []
  let leftNum = 0
  let rightNum = 0
  let removes: string[] = []
  let adds: string[] = []

  function flushPending() {
    const max = Math.max(removes.length, adds.length)
    for (let i = 0; i < max; i++) {
      result.push({
        left: i < removes.length
          ? { num: leftNum - removes.length + i + 1, content: removes[i], type: "remove" }
          : null,
        right: i < adds.length
          ? { num: rightNum - adds.length + i + 1, content: adds[i], type: "add" }
          : null,
      })
    }
    removes = []
    adds = []
  }

  for (const line of rawLines) {
    if (line.startsWith("@@")) {
      flushPending()
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/)
      if (match) {
        leftNum = parseInt(match[1]) - 1
        rightNum = parseInt(match[2]) - 1
      }
      continue
    }
    if (line.startsWith("---") || line.startsWith("+++")) continue
    if (line.startsWith("-")) {
      leftNum++
      removes.push(line.slice(1))
    } else if (line.startsWith("+")) {
      rightNum++
      adds.push(line.slice(1))
    } else {
      flushPending()
      leftNum++
      rightNum++
      const content = line.startsWith(" ") ? line.slice(1) : line
      result.push({
        left: { num: leftNum, content, type: "context" },
        right: { num: rightNum, content, type: "context" },
      })
    }
  }
  flushPending()
  return result
}

function SplitDiff({ diff }: { diff: string }) {
  const lines = useMemo(() => parseSplitLines(diff), [diff])

  return (
    <div className="flex w-full">
      <div className="flex-1 border-r border-edge">
        <div className="flex h-8 items-center bg-surface-secondary px-4">
          <span className="font-mono text-[11px] font-medium text-fg-muted">Before</span>
        </div>
        <div className="overflow-x-auto py-1">
          {lines.map((line, i) => {
            const l = line.left
            const bg = l?.type === "remove" ? "bg-red-500/10" : ""
            return (
              <div key={i} className={`flex h-[22px] items-center gap-3 px-3 font-mono text-[11px] ${bg}`}>
                <span className="w-8 shrink-0 text-right text-fg-faint select-none">{l?.num ?? ""}</span>
                <span className={l?.type === "remove" ? "text-red-600" : "text-fg-muted"}>
                  {l?.content ?? ""}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex h-8 items-center bg-surface-secondary px-4">
          <span className="font-mono text-[11px] font-medium text-fg-muted">After</span>
        </div>
        <div className="overflow-x-auto py-1">
          {lines.map((line, i) => {
            const r = line.right
            const bg = r?.type === "add" ? "bg-green-500/10" : ""
            return (
              <div key={i} className={`flex h-[22px] items-center gap-3 px-3 font-mono text-[11px] ${bg}`}>
                <span className="w-8 shrink-0 text-right text-fg-faint select-none">{r?.num ?? ""}</span>
                <span className={r?.type === "add" ? "text-green-700" : "text-fg-muted"}>
                  {r?.content ?? ""}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function UnifiedDiff({ diff }: { diff: string }) {
  const rawLines = diff.split("\n")
  return (
    <pre className="overflow-x-auto py-2 font-mono text-[11px] leading-[1.7]">
      {rawLines.map((line, i) => {
        if (line.startsWith("---") || line.startsWith("+++")) return null
        const color = line.startsWith("+") ? "text-green-700 bg-green-500/10"
          : line.startsWith("-") ? "text-red-600 bg-red-500/10"
          : line.startsWith("@@") ? "text-blue-600"
          : "text-fg-muted"
        return <span key={i} className={`block px-4 ${color}`}>{line}</span>
      })}
    </pre>
  )
}

function FileSection({ file }: { file: DiffFile }) {
  const [collapsed, setCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("split")
  const stats = useMemo(() => getFileStats(file.diff), [file.diff])

  return (
    <div className="border-b border-edge">
      <div className="flex h-12 items-center justify-between bg-surface px-5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 min-w-0"
        >
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-fg-muted transition-transform ${collapsed ? "" : "rotate-90"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <svg className="h-3.5 w-3.5 shrink-0 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span className="truncate font-mono text-[13px] font-medium text-fg">
            {file.path.replace(/\//g, " / ")}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-[12px] font-semibold text-green-600">+{stats.added}</span>
          <span className="text-[12px] font-semibold text-red-500">&minus;{stats.removed}</span>
          <div className="flex overflow-hidden rounded-md border border-edge">
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 text-[11px] font-medium ${viewMode === "split" ? "bg-surface-secondary text-fg" : "text-fg-muted"}`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode("unified")}
              className={`border-l border-edge px-2.5 py-1 text-[11px] font-medium ${viewMode === "unified" ? "bg-surface-secondary text-fg" : "text-fg-muted"}`}
            >
              Unified
            </button>
          </div>
        </div>
      </div>
      {!collapsed && (
        viewMode === "split"
          ? <SplitDiff diff={file.diff} />
          : <UnifiedDiff diff={file.diff} />
      )}
    </div>
  )
}

interface DiffViewProps {
  files: DiffFile[]
}

export function DiffView({ files }: DiffViewProps) {
  if (files.length === 0) return null

  return (
    <div className="h-full overflow-y-auto bg-surface">
      {files.map((file) => (
        <div key={file.path} id={`diff-file-${file.path}`}>
          <FileSection file={file} />
        </div>
      ))}
    </div>
  )
}
