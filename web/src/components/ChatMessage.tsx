import type { ChatMessage as ChatMessageType } from "../hooks/useSession"
import { ToolCallDisplay } from "./ToolCallDisplay"
import { timeAgo } from "../lib/time"

interface ChatMessageProps {
  message: ChatMessageType
}

function isToolCall(content: string): boolean {
  if (!content.startsWith("{")) return false
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    return "tool" in parsed || "name" in parsed || "command" in parsed
  } catch {
    return false
  }
}

function renderMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="my-2 rounded bg-neutral-950 p-2 font-mono text-xs overflow-x-auto"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-800 px-1 py-0.5 font-mono text-xs">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Line breaks
    .replace(/\n/g, "<br />")
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const isTool = !isUser && !isSystem && isToolCall(message.content)

  if (isTool) {
    return (
      <div className="animate-fade-in px-4 py-1">
        <ToolCallDisplay content={message.content} />
      </div>
    )
  }

  return (
    <div
      className={`animate-fade-in flex px-4 py-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${
          isUser
            ? "bg-blue-600 text-white"
            : isSystem
              ? "border border-red-900/50 bg-red-950/30 text-red-300"
              : "bg-neutral-800 text-neutral-200"
        }`}
      >
        {isUser || isSystem ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <div
            className="prose-invert text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
        <div
          className={`mt-1 text-[10px] ${
            isUser ? "text-blue-300" : "text-neutral-500"
          }`}
        >
          {timeAgo(message.timestamp)}
        </div>
      </div>
    </div>
  )
}
