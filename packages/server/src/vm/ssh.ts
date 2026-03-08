// SSH execution layer for running commands inside VMs.
// Logs commands (truncated) and connection attempts for debugging VM issues.

import { createLogger, truncate } from "../logger"

const log = createLogger("ssh")

export interface SshExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function sshExec(
  host: string,
  port: number,
  command: string,
): Promise<string> {
  log.debug("SSH exec", { host, command: truncate(command) })

  const proc = Bun.spawn(
    ["ssh", "-o", "StrictHostKeyChecking=no", "-p", String(port), `agent@${host}`, command],
    { stdout: "pipe", stderr: "pipe" },
  )

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    log.error("SSH command failed", {
      host,
      command: truncate(command),
      exitCode,
      stderr: truncate(stderr),
    })
    throw new Error(`SSH command failed (exit ${exitCode}): ${truncate(stderr, 200)}`)
  }

  return stdout
}

export async function waitForSsh(
  host: string,
  port: number,
  maxAttempts: number = 30,
  intervalMs: number = 2000,
): Promise<void> {
  const span = log.startOp("ssh-wait", { host })

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log.debug("Waiting for SSH", { host, attempt })
      await sshExec(host, port, "echo ok")
      span.end({ attempts: attempt })
      return
    } catch {
      if (attempt === maxAttempts) {
        const err = new Error(`SSH not available after ${maxAttempts} attempts`)
        span.fail(err)
        throw err
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
}

export async function sshExecStreaming(
  host: string,
  port: number,
  command: string,
  onData: (chunk: string) => void,
): Promise<number> {
  log.debug("SSH exec streaming", { host, command: truncate(command) })

  const proc = Bun.spawn(
    ["ssh", "-o", "StrictHostKeyChecking=no", "-p", String(port), `agent@${host}`, command],
    { stdout: "pipe", stderr: "pipe" },
  )

  const reader = proc.stdout.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onData(decoder.decode(value))
  }

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    log.error("SSH streaming command failed", {
      host,
      command: truncate(command),
      exitCode,
    })
  }

  return exitCode
}
