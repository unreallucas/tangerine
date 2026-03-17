/** Shared activity/event helpers used by ActivityPanel and mobile activities */

export interface EventStyle {
  /** Tailwind bg class for the dot container */
  bgClass: string
  /** Tailwind bg class for the inner dot */
  dotClass: string
}

export const EVENT_STYLES: Record<string, EventStyle> = {
  read:    { bgClass: "bg-blue-500/10",   dotClass: "bg-blue-500" },
  write:   { bgClass: "bg-violet-500/10", dotClass: "bg-violet-500" },
  edit:    { bgClass: "bg-violet-500/10", dotClass: "bg-violet-500" },
  bash:    { bgClass: "bg-blue-500/10",   dotClass: "bg-blue-500" },
  search:  { bgClass: "bg-amber-500/10",  dotClass: "bg-amber-500" },
  test:    { bgClass: "bg-green-500/10",  dotClass: "bg-green-500" },
  default: { bgClass: "bg-blue-500/10",   dotClass: "bg-blue-500" },
}

export function getEventType(content: string): string {
  const lc = content.toLowerCase()
  if (lc.includes("read file") || lc.includes("file-search")) return "read"
  if (lc.includes("write file") || lc.includes("file-pen")) return "write"
  if (lc.includes("edit")) return "edit"
  if (lc.includes("bash") || lc.includes("terminal")) return "bash"
  if (lc.includes("search") || lc.includes("grep")) return "search"
  if (lc.includes("test")) return "test"
  return "default"
}

export function getEventStyle(content: string): EventStyle {
  const type = getEventType(content)
  return EVENT_STYLES[type] ?? EVENT_STYLES.default!
}
