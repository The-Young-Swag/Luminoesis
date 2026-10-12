/*
 * Client side of the tutor Web Worker (tutor.worker.ts). One shared,
 * long-lived worker per page: the model loads once, then every question
 * reuses it. Falls back to null where Workers are unavailable so the
 * provider can run inference on the main thread instead.
 */

export type TutorWorkerDevice = 'webgpu' | 'wasm'

type PendingCall = {
  onProgress?: (fraction: number, file: string) => void
  onToken?: (text: string) => void
  resolve: (text: string) => void
  reject: (error: Error) => void
  timer: number
}

const LOAD_TIMEOUT_MS = 60000
const GENERATE_TIMEOUT_MS = 30000

let nextId = 1

export type TutorWorkerClient = {
  load: (
    modelId: string,
    device: TutorWorkerDevice,
    dtype: string,
    onProgress?: (fraction: number, file: string) => void,
  ) => Promise<void>
  generate: (
    messages: Array<{ role: string; content: string }>,
    maxNewTokens: number,
    onToken?: (text: string) => void,
  ) => Promise<string>
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

  function failCall(id: number, error: Error): void {
    const call = pending.get(id)
    if (!call) return
    pending.delete(id)
    window.clearTimeout(call.timer)
    call.reject(error)
  }

  worker.onmessage = (event: MessageEvent) => {
    const message = event.data as
      | { id: number; type: 'progress'; fraction?: unknown; file?: unknown }
      | { id: number; type: 'ready' }
      | { id: number; type: 'token'; text?: unknown }
      | { id: number; type: 'done'; text?: unknown }
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
      return
    }

    if (message.type === 'token') {
      if (typeof message.text === 'string') call.onToken?.(message.text)
      return
    }

    if (message.type === 'done') {
      pending.delete(message.id)
      window.clearTimeout(call.timer)
      call.resolve(typeof message.text === 'string' ? message.text : '')
      return
    }

    if (message.type === 'error') {
      failCall(
        message.id,
        new Error(
          typeof message.message === 'string' ? message.message : 'Worker failed',
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

  function send(message: Record<string, unknown>, call: Omit<PendingCall, 'timer'>, timeoutMs: number): void {
    const id = nextId
    nextId += 1
    const timer = window.setTimeout(() => {
      failCall(id, new Error('Tutor worker timed out'))
    }, timeoutMs)
    pending.set(id, { ...call, timer })
    worker.postMessage({ ...message, id })
  }

  return {
    load(modelId, device, dtype, onProgress) {
      return new Promise<void>((resolve, reject) => {
        send(
          { type: 'load', modelId, device, dtype },
          {
            onProgress,
            resolve: () => resolve(),
            reject,
          },
          LOAD_TIMEOUT_MS,
        )
      })
    },

    generate(messages, maxNewTokens, onToken) {
      return new Promise<string>((resolve, reject) => {
        send(
          { type: 'generate', messages, maxNewTokens },
          { onToken, resolve, reject },
          GENERATE_TIMEOUT_MS,
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
