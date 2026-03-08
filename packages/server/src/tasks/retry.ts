// Retry wrapper with exponential backoff.
// Logs each attempt so failures can be diagnosed from the timeline.

import { createLogger } from "../logger"

const log = createLogger("retry")

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  taskId?: string
}

export async function withRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, taskId } = options
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn()
      if (attempt > 1) {
        log.info("Retry succeeded", { taskId, op: operation, attempt })
      }
      return result
    } catch (err) {
      lastError = err
      const errorMessage = err instanceof Error ? err.message : String(err)

      if (attempt < maxAttempts) {
        log.warn(`Retry attempt ${attempt}/${maxAttempts}`, {
          taskId,
          op: operation,
          attempt,
          maxAttempts,
          error: errorMessage,
        })
        // Exponential backoff with jitter
        const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * baseDelayMs
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        log.error("All retries exhausted", {
          taskId,
          op: operation,
          attempts: maxAttempts,
          lastError: errorMessage,
        })
      }
    }
  }

  throw lastError
}
