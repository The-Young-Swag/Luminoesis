import {
  TextStreamer,
  env,
  pipeline,
  type PreTrainedTokenizer,
} from '@huggingface/transformers'

import { resolveWasmThreads } from './wasmThreads'

/*
 * Tutor inference runs here, off the main thread, so token generation
 * never blocks typing, scrolling, or grading. The client side lives in
 * tutorWorkerClient.ts — this file only speaks the message protocol.
 *
 * Main → worker:
 *   { id, type: 'load', modelId, device, dtype }
 *   { id, type: 'generate', messages, maxNewTokens }
 * Worker → main:
 *   { id, type: 'progress', fraction, file }
 *   { id, type: 'phase', phase: 'download' | 'session' }
 *   { id, type: 'ready', timings }
 *   { id, type: 'token', text }      (streaming deltas)
 *   { id, type: 'done', text, timings } (final text)
 *   { id, type: 'error', message }
 *
 * The phase messages split load budgets: 'download' covers weight
 * fetching (long total, stall on silence), 'session' covers ONNX session
 * creation, which is silent by nature and gets its own budget.
 */

env.allowLocalModels = false

try {
  const backends = (
    env as unknown as {
      backends?: { onnx?: { wasm?: Record<string, unknown> } }
    }
  ).backends
  if (backends?.onnx?.wasm) {
    backends.onnx.wasm.numThreads = resolveWasmThreads()
  }
} catch {
  // Thread config is an optimization, never a blocker.
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type Inbound =
  | {
      id: number
      type: 'load'
      modelId: string
      device: 'webgpu' | 'wasm'
      dtype: 'q4' | 'q8'
    }
  | {
      id: number
      type: 'generate'
      messages: ChatMessage[]
      maxNewTokens: number
    }
  | { id: number; type: 'embed'; texts: string[] }

type TextGenerator = (
  input: ChatMessage[],
  options?: unknown,
) => Promise<Array<{ generated_text: ChatMessage[] | string }>>

type EmbeddingExtractor = (
  texts: string[],
  options?: unknown,
) => Promise<{ tolist: () => number[][] }>

/** Token count from whatever shape a tokenizer call returns. */
function countTokenIds(ids: unknown): number | null {
  if (Array.isArray(ids)) return ids.length
  if (ids !== null && typeof ids === 'object') {
    const record = ids as { dims?: unknown; data?: unknown; length?: unknown }
    if (Array.isArray(record.dims) && record.dims.length > 0) {
      const last = record.dims[record.dims.length - 1]
      if (typeof last === 'number') return last
      if (typeof last === 'bigint') return Number(last)
    }
    if (
      record.data !== null &&
      typeof record.data === 'object' &&
      typeof (record.data as { length?: unknown }).length === 'number'
    ) {
      return (record.data as { length: number }).length
    }
    if (typeof record.length === 'number') return record.length
  }
  return null
}

let generator: TextGenerator | null = null
let generatorKey = ''
let generatorTokenizer: PreTrainedTokenizer | null = null
let embedder: EmbeddingExtractor | null = null

export type WorkerGenerateTimings = {
  tokenizeMs: number | null
  promptTokens: number | null
  prefillMs: number | null
  decodeMs: number | null
  outputTokens: number | null
}

export type WorkerLoadTimings = {
  downloadMs: number | null
  sessionMs: number | null
}

async function handleLoad(
  message: Extract<Inbound, { type: 'load' }>,
): Promise<void> {
  const key = `${message.modelId}|${message.device}|${message.dtype}`

  if (generator && generatorKey === key) {
    self.postMessage({ id: message.id, type: 'ready', timings: null })
    return
  }

  const loadStart = performance.now()
  let initiated = 0
  let completed = 0
  let phase: 'download' | 'session' = 'download'
  let downloadEnd: number | null = null

  const enterSessionPhase = () => {
    if (phase === 'session') return
    phase = 'session'
    if (downloadEnd === null) downloadEnd = performance.now()
    self.postMessage({ id: message.id, type: 'phase', phase: 'session' })
  }

  // Fully-cached models may emit no progress events at all. If nothing
  // starts downloading within a few seconds, the only remaining work is
  // session creation — say so, so the client applies the session budget
  // instead of the download stall timer.
  const cacheProbe = setTimeout(() => {
    if (initiated === 0) enterSessionPhase()
  }, 5000)

  const downloadStart = performance.now()
  try {
    const pipe = await pipeline('text-generation', message.modelId, {
      device: message.device,
      dtype: message.dtype,
      progress_callback: (entry: {
        status: string
        progress?: number
        file?: string
      }) => {
        if (entry.status === 'initiate') initiated += 1
        if (entry.status === 'done') {
          completed += 1
          if (initiated > 0 && completed >= initiated) enterSessionPhase()
        }
        self.postMessage({
          id: message.id,
          type: 'progress',
          fraction:
            typeof entry.progress === 'number' ? entry.progress / 100 : 0,
          file: entry.file ?? '',
        })
      },
    })

    generator = pipe as unknown as TextGenerator
    generatorTokenizer = (pipe as unknown as { tokenizer: PreTrainedTokenizer })
      .tokenizer
    generatorKey = key
    const readyAt = performance.now()
    clearTimeout(cacheProbe)
    self.postMessage({
      id: message.id,
      type: 'ready',
      timings: {
        downloadMs: Math.round((downloadEnd ?? readyAt) - downloadStart),
        sessionMs: Math.round(readyAt - (downloadEnd ?? loadStart)),
      } satisfies WorkerLoadTimings,
    })
  } catch (error) {
    clearTimeout(cacheProbe)
    throw error
  }
}

const EMBEDDER_MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

async function handleEmbed(
  message: Extract<Inbound, { type: 'embed' }>,
): Promise<void> {
  if (!embedder) {
    const extractor = await pipeline('feature-extraction', EMBEDDER_MODEL_ID, {
      device: 'wasm',
      progress_callback: (entry: {
        status: string
        progress?: number
        file?: string
      }) => {
        self.postMessage({
          id: message.id,
          type: 'progress',
          fraction:
            typeof entry.progress === 'number' ? entry.progress / 100 : 0,
          file: entry.file ?? '',
        })
      },
    })
    embedder = extractor as unknown as EmbeddingExtractor
  }

  const output = await embedder(message.texts, {
    pooling: 'mean',
    normalize: true,
  })
  self.postMessage({
    id: message.id,
    type: 'done',
    text: JSON.stringify(output.tolist()),
  })
}

async function handleGenerate(
  message: Extract<Inbound, { type: 'generate' }>,
): Promise<void> {
  if (!generator) {
    throw new Error('Generator is not loaded. Send load first.')
  }

  // Prefill is silent like session creation (no tokens flow until the
  // first one), so it gets its own stall allowance on the client.
  self.postMessage({ id: message.id, type: 'phase', phase: 'prefill' })

  const generateStart = performance.now()

  let tokenizeMs: number | null = null
  let promptTokens: number | null = null
  try {
    const tokenizeStart = performance.now()
    const ids = generatorTokenizer?.apply_chat_template(message.messages, {
      tokenize: true,
      add_generation_prompt: true,
    }) as unknown
    tokenizeMs = Math.round(performance.now() - tokenizeStart)
    // tokenize:true returns a Tensor ({ dims, data }), not a number[].
    promptTokens = countTokenIds(ids)
  } catch {
    // Token counting is measurement-only; generation continues regardless.
  }

  let firstTokenAt: number | null = null
  const streamer = generatorTokenizer
    ? new TextStreamer(generatorTokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          if (firstTokenAt === null) firstTokenAt = performance.now()
          self.postMessage({ id: message.id, type: 'token', text })
        },
      })
    : undefined

  const output = await generator(message.messages, {
    max_new_tokens: message.maxNewTokens,
    do_sample: false,
    ...(streamer ? { streamer } : {}),
  })

  const generateEnd = performance.now()
  const raw = output[0]?.generated_text
  const finalText = (
    Array.isArray(raw) ? (raw.at(-1)?.content ?? '') : String(raw ?? '')
  ).trim()

  let outputTokens: number | null = null
  try {
    const encoded = generatorTokenizer?.encode(finalText) as unknown
    outputTokens = countTokenIds(encoded)
  } catch {
    // Measurement-only.
  }

  const prefillMs =
    firstTokenAt !== null ? Math.round(firstTokenAt - generateStart) : null
  const firstAt: number | null = firstTokenAt
  const timings: WorkerGenerateTimings = {
    tokenizeMs,
    promptTokens,
    prefillMs,
    decodeMs:
      firstAt !== null
        ? Math.round(generateEnd - firstAt)
        : Math.round(generateEnd - generateStart),
    outputTokens,
  }

  self.postMessage({ id: message.id, type: 'done', text: finalText, timings })
}

self.onmessage = async (event: MessageEvent<Inbound>) => {
  const message = event.data

  try {
    if (message.type === 'load') {
      await handleLoad(message)
    } else if (message.type === 'embed') {
      await handleEmbed(message)
    } else {
      await handleGenerate(message)
    }
  } catch (error) {
    self.postMessage({
      id: message.id,
      type: 'error',
      message: error instanceof Error ? error.message : 'Worker failed',
    })
  }
}
