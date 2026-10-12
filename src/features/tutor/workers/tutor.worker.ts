import { TextStreamer, env, pipeline, type PreTrainedTokenizer } from '@huggingface/transformers'

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
 *   { id, type: 'ready' }
 *   { id, type: 'token', text }      (streaming deltas)
 *   { id, type: 'done', text }       (final text)
 *   { id, type: 'error', message }
 */

env.allowLocalModels = false

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type Inbound =
  | { id: number; type: 'load'; modelId: string; device: 'webgpu' | 'wasm'; dtype: 'q4' | 'q8' }
  | { id: number; type: 'generate'; messages: ChatMessage[]; maxNewTokens: number }

type TextGenerator = (
  input: ChatMessage[],
  options?: unknown,
) => Promise<Array<{ generated_text: ChatMessage[] | string }>>

let generator: TextGenerator | null = null
let generatorKey = ''
let generatorTokenizer: PreTrainedTokenizer | null = null

async function handleLoad(message: Extract<Inbound, { type: 'load' }>): Promise<void> {
  const key = `${message.modelId}|${message.device}|${message.dtype}`

  if (generator && generatorKey === key) {
    self.postMessage({ id: message.id, type: 'ready' })
    return
  }

  const pipe = await pipeline('text-generation', message.modelId, {
    device: message.device,
    dtype: message.dtype,
    progress_callback: (entry: { status: string; progress?: number; file?: string }) => {
      self.postMessage({
        id: message.id,
        type: 'progress',
        fraction: typeof entry.progress === 'number' ? entry.progress / 100 : 0,
        file: entry.file ?? '',
      })
    },
  })

  generator = pipe as unknown as TextGenerator
  generatorTokenizer = (pipe as unknown as { tokenizer: PreTrainedTokenizer }).tokenizer
  generatorKey = key
  self.postMessage({ id: message.id, type: 'ready' })
}

async function handleGenerate(message: Extract<Inbound, { type: 'generate' }>): Promise<void> {
  if (!generator) {
    throw new Error('Generator is not loaded. Send load first.')
  }

  const streamer = generatorTokenizer
    ? new TextStreamer(generatorTokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          self.postMessage({ id: message.id, type: 'token', text })
        },
      })
    : undefined

  const output = await generator(message.messages, {
    max_new_tokens: message.maxNewTokens,
    do_sample: false,
    ...(streamer ? { streamer } : {}),
  })

  const raw = output[0]?.generated_text
  const finalText = (
    Array.isArray(raw) ? (raw.at(-1)?.content ?? '') : String(raw ?? '')
  ).trim()

  self.postMessage({ id: message.id, type: 'done', text: finalText })
}

self.onmessage = async (event: MessageEvent<Inbound>) => {
  const message = event.data

  try {
    if (message.type === 'load') {
      await handleLoad(message)
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
