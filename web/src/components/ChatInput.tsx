import { useState, useRef, useCallback, type KeyboardEvent } from "react"

interface ChatInputProps {
  onSend: (text: string) => void
  disabled: boolean
  queueLength: number
}

export function ChatInput({ onSend, disabled, queueLength }: ChatInputProps) {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [text, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    // Max 6 lines (~144px at default line-height)
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`
  }, [])

  return (
    <div className="border-t border-neutral-800 bg-neutral-900 p-3">
      <div className="flex items-end gap-2">
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              handleInput()
            }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Agent is working..." : "Type a message..."}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-tangerine disabled:cursor-not-allowed disabled:opacity-50"
          />
          {queueLength > 0 && (
            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-tangerine text-[10px] font-bold text-white">
              {queueLength}
            </span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="shrink-0 rounded-lg bg-tangerine px-4 py-2 text-sm font-medium text-white transition hover:bg-tangerine-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
