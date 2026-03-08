import { describe, it, expect, beforeEach, mock } from "bun:test"
import {
  enqueue,
  setAgentState,
  drainNext,
  clearQueue,
  type SendPromptFn,
} from "../agent/prompt-queue"

/**
 * Tracer bullet: Prompt enqueue -> Agent state tracking -> Delivery
 *
 * Tests the prompt queue that buffers follow-up prompts while the
 * agent is busy, and delivers them in order as the agent goes idle.
 */
describe("tracer: prompt queue -> agent state -> delivery", () => {
  const tid = () => `task-${crypto.randomUUID().slice(0, 8)}`
  let sentPrompts: Array<{ taskId: string; text: string }>
  let sendPrompt: SendPromptFn

  beforeEach(() => {
    sentPrompts = []
    sendPrompt = mock(async (taskId: string, text: string) => {
      sentPrompts.push({ taskId, text })
    }) as SendPromptFn
  })

  it("enqueues a prompt and drains when agent is idle", async () => {
    const t = tid()

    enqueue(t, "Hello agent")

    // Agent is idle by default, drain should send
    const sent = await drainNext(t, sendPrompt)
    expect(sent).toBe(true)
    expect(sentPrompts).toHaveLength(1)
    expect(sentPrompts[0]!.text).toBe("Hello agent")
    expect(sentPrompts[0]!.taskId).toBe(t)

    clearQueue(t)
  })

  it("does not drain when agent is busy", async () => {
    const t = tid()

    enqueue(t, "Queued message")
    setAgentState(t, "busy")

    const sent = await drainNext(t, sendPrompt)
    expect(sent).toBe(false)
    expect(sentPrompts).toHaveLength(0)

    clearQueue(t)
  })

  it("drains queued prompt when agent transitions to idle", async () => {
    const t = tid()

    // Agent is busy, queue a prompt
    setAgentState(t, "busy")
    enqueue(t, "Queued message")

    // Nothing should drain while busy
    let sent = await drainNext(t, sendPrompt)
    expect(sent).toBe(false)

    // Agent goes idle
    setAgentState(t, "idle")
    sent = await drainNext(t, sendPrompt)
    expect(sent).toBe(true)
    expect(sentPrompts).toHaveLength(1)
    expect(sentPrompts[0]!.text).toBe("Queued message")

    clearQueue(t)
  })

  it("delivers multiple prompts in FIFO order", async () => {
    const t = tid()

    enqueue(t, "First")
    enqueue(t, "Second")
    enqueue(t, "Third")

    // Drain first
    await drainNext(t, sendPrompt)
    expect(sentPrompts).toHaveLength(1)
    expect(sentPrompts[0]!.text).toBe("First")

    // After sending, agent is marked busy by drainNext.
    // Simulate agent finishing and going idle.
    setAgentState(t, "idle")

    // Drain second
    await drainNext(t, sendPrompt)
    expect(sentPrompts).toHaveLength(2)
    expect(sentPrompts[1]!.text).toBe("Second")

    setAgentState(t, "idle")

    // Drain third
    await drainNext(t, sendPrompt)
    expect(sentPrompts).toHaveLength(3)
    expect(sentPrompts[2]!.text).toBe("Third")

    // Queue should be empty now
    setAgentState(t, "idle")
    const emptySend = await drainNext(t, sendPrompt)
    expect(emptySend).toBe(false)

    clearQueue(t)
  })

  it("clearQueue removes all pending prompts", () => {
    const t = tid()

    setAgentState(t, "busy")
    enqueue(t, "A")
    enqueue(t, "B")
    enqueue(t, "C")

    clearQueue(t)

    // After clearing, nothing should drain
    setAgentState(t, "idle")
    // drainNext needs to be called, but queue is cleared
  })

  it("clearQueue followed by drain returns false", async () => {
    const t = tid()

    enqueue(t, "Will be cleared")
    clearQueue(t)

    const sent = await drainNext(t, sendPrompt)
    expect(sent).toBe(false)
    expect(sentPrompts).toHaveLength(0)
  })

  it("re-queues prompt on send failure", async () => {
    const t = tid()
    const failingSend: SendPromptFn = async () => {
      throw new Error("Send failed")
    }

    enqueue(t, "Will fail")

    // drainNext should throw when send fails
    await expect(drainNext(t, failingSend)).rejects.toThrow("Send failed")

    // The prompt should be re-queued (put back at front)
    // Agent should be back to idle
    const retrySent = await drainNext(t, sendPrompt)
    expect(retrySent).toBe(true)
    expect(sentPrompts).toHaveLength(1)
    expect(sentPrompts[0]!.text).toBe("Will fail")

    clearQueue(t)
  })

  it("drainNext sets agent state to busy", async () => {
    const t = tid()

    enqueue(t, "Test")

    // First drain succeeds and sets state to busy
    await drainNext(t, sendPrompt)
    expect(sentPrompts).toHaveLength(1)

    // Enqueue another, try to drain without setting idle
    enqueue(t, "Second")
    const sent = await drainNext(t, sendPrompt)
    // Should not drain because state is busy after first drain
    expect(sent).toBe(false)

    clearQueue(t)
  })

  it("separate tasks have independent queues", async () => {
    const t1 = tid()
    const t2 = tid()

    enqueue(t1, "For task 1")
    enqueue(t2, "For task 2")

    setAgentState(t1, "busy")

    // Only t2 should drain (t1 is busy)
    const sent1 = await drainNext(t1, sendPrompt)
    expect(sent1).toBe(false)

    const sent2 = await drainNext(t2, sendPrompt)
    expect(sent2).toBe(true)

    expect(sentPrompts).toHaveLength(1)
    expect(sentPrompts[0]!.taskId).toBe(t2)
    expect(sentPrompts[0]!.text).toBe("For task 2")

    clearQueue(t1)
    clearQueue(t2)
  })

  it("drains nothing from empty queue", async () => {
    const t = tid()

    const sent = await drainNext(t, sendPrompt)
    expect(sent).toBe(false)
    expect(sentPrompts).toHaveLength(0)
  })
})
