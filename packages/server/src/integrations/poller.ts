/**
 * Generic polling loop that runs a function at a fixed interval.
 * Non-overlapping: waits for the previous poll to complete before scheduling the next.
 */
export class Poller {
  private intervalMs: number
  private pollFn: () => Promise<void>
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false

  constructor(intervalMs: number, pollFn: () => Promise<void>) {
    this.intervalMs = intervalMs
    this.pollFn = pollFn
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.schedule()
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private schedule(): void {
    if (!this.running) return
    this.timer = setTimeout(async () => {
      try {
        await this.pollFn()
      } catch (err) {
        console.error("Poller error:", err)
      }
      this.schedule()
    }, this.intervalMs)
  }
}
