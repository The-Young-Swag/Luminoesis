/*
 * Client side of the tutor Web Worker (tutor.worker.ts). One shared,
 * long-lived worker per page: the model loads once, then every question
 * reuses it. Falls back to null where Workers are unavailable so the
 * provider can run inference on the main thread instead.
 *
 * Budgets are STALL timers, not total timers: every progress / token /
 * phase message re-arms the stall clock. A slow download (hundreds of MB
 * on a slow link) must never trigger a fallback that restarts the same
 * download. Loads additionally split into a download budget and a
 * session-creation budget (the worker signals the phase change), because
 * ONNX session init is silent by nature and needs its own allowance.
 */

import type { WorkerGenerateTimings, WorkerLoadTimings } from './tutor.worker'

export type TutorWorkerDevice = 'webgpu' | 'wasm'

type PendingCall = {
  onProgress?: (fraction: number, file: string) => void
  onToken?: (text: string) => void
  onPhase?: (phase: string) => void
  resolve: (value: { text: string; timings?: unknown }) => void
  reject: (error: Error) => void
  /** Current stall allowance; replaced when the load enters session phase. */
  stallMs: number
  stallTimer: number
  totalTimer: number
}

type Budget = {
  /** Silence longer than this fails the call. Re-armed on activity. */
  stallMs: number
  /** Absolute backstop, never re-armed (except on phase change). */
  totalMs: number
}

const LOAD_DOWNLOAD_BUDGET: Budget = { stallMs: 90000, totalMs: 600000 }
const LOAD_SESSION_BUDGET: Budget = { stallMs: 180000, totalMs: 300000 }
const GENERATE_BUDGET: Budget = { stallMs: 60000, totalMs: 600000 }
/*
 * Prefill runs silent (no tokens until the first one completes), so a
 * healthy prefill on a slow device would trip the token stall timer.
 * First-token allowance is generous; afterwards each token re-arms the
 * normal 60 s clock.
 */
const GENERATE_PREFILL_STALL_MS = 300000
const EMBED_BUDGET: Budget = { stallMs: 60000, totalMs: 120000 }

let nextId = 1

let sharedClient: TutorWorkerClient | null | undefined

/** One worker per page, shared by generation and embeddings. */
export function getSharedTutorWorker(): TutorWorkerClient | null {
  if (sharedClient !== undefined) return sharedClient
  sharedClient = createTutorWorker()
  return sharedClient
}

/** Drop a wedged worker so the next call starts fresh. */
export function resetSharedTutorWorker(): void {
  try {
    sharedClient?.terminate()
  } catch {
    // Already gone — nothing to clean up.
  }
  sharedClient = undefined
}

/** Cancel an in-flight load (download or session creation). */
export function cancelSharedTutorWorker(): void {
  resetSharedTutorWorker()
}

export type TutorWorkerClient = {
  load: (
    modelId: string,
    device: TutorWorkerDevice,
    dtype: string,
    onProgress?: (fraction: number, file: string) => void,
  ) => Promise<WorkerLoadTimings | null>
  generate: (
    messages: Array<{ role: string; content: string }>,
    maxNewTokens: number,
    onToken?: (text: string) => void,
  ) => Promise<{ text: string; timings: WorkerGenerateTimings | null }>
  embed: (texts: string[]) => Promise<number[][]>
  terminate: () => void
}

export function createTutorWorker(): TutorWorkerClient | null {
  let worker: Worker

  try {
    worker = new Worker(new URL('./tutor.worker.ts', import.meta.url), {
      type: 'module',
    })
  } catch {
    return null
  }

  const pending = new Map<number, PendingCall>()

  function clearCallTimers(call: PendingCall): void {
    window.clearTimeout(call.stallTimer)
    window.clearTimeout(call.totalTimer)
  }

  function failCall(id: number, error: Error): void {
    const call = pending.get(id)
    if (!call) return
    pending.delete(id)
    clearCallTimers(call)
    call.reject(error)
  }

  function armStallTimer(id: number): void {
    const call = pending.get(id)
    if (!call) return
    window.clearTimeout(call.stallTimer)
    call.stallTimer = window.setTimeout(() => {
      failCall(id, new Error('Tutor worker stalled (no progress)'))
    }, call.stallMs)
  }

  worker.onmessage = (event: MessageEvent) => {
    const message = event.data as
      | { id: number; type: 'progress'; fraction?: unknown; file?: unknown }
      | { id: number; type: 'phase'; phase?: unknown }
      | { id: number; type: 'ready'; timings?: unknown }
      | { id: number; type: 'token'; text?: unknown }
      | { id: number; type: 'done'; text?: unknown; timings?: unknown }
      | { id: number; type: 'error'; message?: unknown }
      | { id?: undefined }

    if (typeof message.id !== 'number') return
    const call = pending.get(message.id)
    if (!call) return

    if (message.type === 'progress') {
      call.onProgress?.(
        typeof message.fraction === 'number' ? message.fraction : 0,
        typeof message.file === 'string' ? message.file : '',
      )
      armStallTimer(message.id)
      return
    }

    if (message.type === 'phase') {
      if (typeof message.phase === 'string') call.onPhase?.(message.phase)
      if (message.phase === 'prefill') {
        switchGenerateToPrefillBudget(message.id)
      } else {
        switchLoadToSessionBudget(message.id)
      }
      return
    }

    if (message.type === 'token') {
      if (typeof message.text === 'string') call.onToken?.(message.text)
      endPrefillBudget(message.id)
      armStallTimer(message.id)
      return
    }

    if (message.type === 'done') {
      pending.delete(message.id)
      clearCallTimers(call)
      call.resolve({
        text: typeof message.text === 'string' ? message.text : '',
        timings:
          message.timings !== undefined && message.timings !== null
            ? (message.timings as WorkerGenerateTimings)
            : null,
      })
      return
    }

    if (message.type === 'ready') {
      pending.delete(message.id)
      clearCallTimers(call)
      call.resolve({
        text: '',
        timings:
          message.timings !== undefined && message.timings !== null
            ? (message.timings as WorkerLoadTimings)
            : null,
      })
      return
    }

    if (message.type === 'error') {
      failCall(
        message.id,
        new Error(
          typeof message.message === 'string'
            ? message.message
            : 'Worker failed',
        ),
      )
      return
    }
  }

  worker.onerror = () => {
    for (const id of [...pending.keys()]) {
      failCall(id, new Error('Tutor worker crashed'))
    }
  }

  function send(
    message: Record<string, unknown>,
    call: Omit<PendingCall, 'stallMs' | 'stallTimer' | 'totalTimer'>,
    budget: Budget,
  ): void {
    const id = nextId
    nextId += 1
    const full: PendingCall = {
      ...call,
      stallMs: budget.stallMs,
      stallTimer: 0,
      totalTimer: 0,
    }
    full.stallTimer = window.setTimeout(() => {
      failCall(id, new Error('Tutor worker stalled (no progress)'))
    }, budget.stallMs)
    full.totalTimer = window.setTimeout(() => {
      failCall(id, new Error('Tutor worker timed out'))
    }, budget.totalMs)
    pending.set(id, full)
    worker.postMessage({ ...message, id })
  }

  function switchLoadToSessionBudget(id: number): void {
    const call = pending.get(id)
    if (!call) return
    // Session creation is silent: fresh total clock, looser stall clock.
    window.clearTimeout(call.totalTimer)
    call.totalTimer = window.setTimeout(() => {
      failCall(id, new Error('Tutor worker session creation timed out'))
    }, LOAD_SESSION_BUDGET.totalMs)
    window.clearTimeout(call.stallTimer)
    call.stallMs = LOAD_SESSION_BUDGET.stallMs
    call.stallTimer = window.setTimeout(() => {
      failCall(id, new Error('Tutor worker stalled (no progress)'))
    }, LOAD_SESSION_BUDGET.stallMs)
  }

  function switchGenerateToPrefillBudget(id: number): void {
    const call = pending.get(id)
    if (!call) return
    window.clearTimeout(call.stallTimer)
    call.stallMs = GENERATE_PREFILL_STALL_MS
    call.stallTimer = window.setTimeout(() => {
      failCall(id, new Error('Tutor worker stalled during prefill'))
    }, GENERATE_PREFILL_STALL_MS)
  }

  function endPrefillBudget(id: number): void {
    const call = pending.get(id)
    if (!call) return
    // First token arrived: back to the per-token stall clock.
    call.stallMs = GENERATE_BUDGET.stallMs
  }

  return {
    load(modelId, device, dtype, onProgress) {
      return new Promise<WorkerLoadTimings | null>((resolve, reject) => {
        send(
          { type: 'load', modelId, device, dtype },
          {
            onProgress,
            resolve: (value: { text: string; timings?: unknown }) => {
              const timings = value.timings as
                WorkerLoadTimings | null | undefined
              resolve(timings ?? null)
            },
            reject,
          },
          LOAD_DOWNLOAD_BUDGET,
        )
      })
    },

    generate(messages, maxNewTokens, onToken) {
      return new Promise<{
        text: string
        timings: WorkerGenerateTimings | null
      }>((resolve, reject) => {
        send(
          { type: 'generate', messages, maxNewTokens },
          {
            onToken,
            resolve: (value: { text: string; timings?: unknown }) =>
              resolve({
                text: value.text,
                timings:
                  value.timings !== undefined && value.timings !== null
                    ? (value.timings as WorkerGenerateTimings)
                    : null,
              }),
            reject,
          },
          GENERATE_BUDGET,
        )
      })
    },

    embed(texts) {
      return new Promise<number[][]>((resolve, reject) => {
        send(
          { type: 'embed', texts },
          {
            resolve: ({ text: json }: { text: string }) => {
              try {
                resolve(JSON.parse(json) as number[][])
              } catch {
                reject(new Error('Bad embedding payload'))
              }
            },
            reject,
          },
          EMBED_BUDGET,
        )
      })
    },

    terminate() {
      for (const id of [...pending.keys()]) {
        failCall(id, new Error('Tutor worker terminated'))
      }
      worker.terminate()
    },
  }
}
