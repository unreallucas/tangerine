import { useState } from "react"

interface ToolCallDisplayProps {
  content: string
}

interface ToolCallData {
  tool?: string
  name?: string
  input?: Record<string, unknown>
  output?: string
  command?: string
  path?: string
  diff?: string
}

function parseToolCall(content: string): ToolCallData | null {
  try {
    return JSON.parse(content) as ToolCallData
  } catch {
    return null
  }
}

export function ToolCallDisplay({ content }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  const toolData = parseToolCall(content)

  if (!toolData) {
    return (
      <pre className="overflow-x-auto rounded bg-neutral-900 p-2 text-xs text-neutral-300">
        {content}
      </pre>
    )
  }

  const toolName = toolData.tool || toolData.name || "Tool Call"
  const isFileEdit = toolName.toLowerCase().includes("edit") || toolName.toLowerCase().includes("write")
  const isShell = toolName.toLowerCase().includes("shell") || toolName.toLowerCase().includes("bash") || toolName.toLowerCase().includes("exec")

  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-400 hover:text-neutral-300"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
          &#9654;
        </span>
        {isShell && <span className="font-mono text-green-400">$</span>}
        {isFileEdit && <span className="text-blue-400">&#128196;</span>}
        <span className="font-medium">{toolName}</span>
        {toolData.path && (
          <span className="truncate font-mono text-neutral-500">{toolData.path}</span>
        )}
        {toolData.command && (
          <span className="truncate font-mono text-neutral-500">{toolData.command}</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-neutral-800 p-3">
          {toolData.command && (
            <div className="mb-2">
              <div className="mb-1 text-xs text-neutral-500">Command</div>
              <pre className="rounded bg-neutral-950 p-2 font-mono text-xs text-green-400">
                $ {toolData.command}
              </pre>
            </div>
          )}

          {toolData.diff && (
            <div className="mb-2">
              <div className="mb-1 text-xs text-neutral-500">Changes</div>
              <pre className="overflow-x-auto rounded bg-neutral-950 p-2 font-mono text-xs">
                {toolData.diff.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("+")
                        ? "text-green-400"
                        : line.startsWith("-")
                          ? "text-red-400"
                          : "text-neutral-400"
                    }
                  >
                    {line}
                  </div>
                ))}
              </pre>
            </div>
          )}

          {toolData.output && (
            <div>
              <div className="mb-1 text-xs text-neutral-500">Output</div>
              <pre className="max-h-48 overflow-auto rounded bg-neutral-950 p-2 font-mono text-xs text-neutral-300">
                {toolData.output}
              </pre>
            </div>
          )}

          {toolData.input && !toolData.command && !toolData.diff && (
            <pre className="overflow-x-auto rounded bg-neutral-950 p-2 font-mono text-xs text-neutral-300">
              {JSON.stringify(toolData.input, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
