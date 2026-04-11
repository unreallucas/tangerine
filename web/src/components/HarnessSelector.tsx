import { isProviderAvailable as checkProvider, type ProviderType, type SystemCapabilities } from "@tangerine/shared"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Terminal } from "lucide-react"

interface HarnessSelectorProps {
  value: ProviderType
  onChange: (value: ProviderType) => void
  systemCapabilities?: SystemCapabilities | null
}

const harnesses: { value: ProviderType; label: string }[] = [
  { value: "claude-code", label: "Claude Code" },
  { value: "opencode", label: "OpenCode" },
  { value: "codex", label: "Codex" },
  { value: "pi", label: "Pi" },
]

export function HarnessSelector({ value, onChange, systemCapabilities: capsRaw }: HarnessSelectorProps) {
  const systemCapabilities = capsRaw ?? null

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as ProviderType)
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-auto gap-1.5 rounded-md border-border bg-muted px-2 py-1 text-xxs hover:bg-background"
      >
        <Terminal className="h-3 w-3 text-muted-foreground" />
        <SelectValue>
          {harnesses.find((h) => h.value === value)?.label ?? value}
          {!checkProvider(systemCapabilities, value) && (
            <span className="text-2xs text-status-error-text">(not installed)</span>
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent side="top" align="start" alignItemWithTrigger={false} className="min-w-[160px]">
        {harnesses.map((h) => {
          const available = checkProvider(systemCapabilities, h.value)
          const cliCmd = systemCapabilities?.providers[h.value]?.cliCommand
          return (
            <SelectItem
              key={h.value}
              value={h.value}
              disabled={!available}
              title={!available ? `Requires ${cliCmd ?? h.value} CLI` : undefined}
            >
              <Terminal className="h-3 w-3 text-muted-foreground" />
              <span>{h.label}</span>
              {!available && <span className="text-2xs text-muted-foreground">(not installed)</span>}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
