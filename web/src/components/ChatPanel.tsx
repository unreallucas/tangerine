import { useEffect, useRef } from "react"
import type { ChatMessage as ChatMessageType } from "../hooks/useSession"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"

interface ChatPanelProps {
  messages: ChatMessageType[]
  agentStatus: "idle" | "working"
  queueLength: number
  onSend: (text: string) => void
  onAbort: () => void
}

export function ChatPanel({ messages, agentStatus, queueLength, onSend, onAbort }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            No messages yet. Send a prompt to start.
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
      </div>

      {/* Abort button */}
      {agentStatus === "working" && (
        <div className="flex justify-center border-t border-neutral-800 py-2">
          <button
            onClick={onAbort}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
          >
            Stop
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={onSend}
        disabled={agentStatus === "working"}
        queueLength={queueLength}
      />
    </div>
  )
}
