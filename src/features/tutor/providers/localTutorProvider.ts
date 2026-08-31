/**
 * Lazy on-device pipeline — cached after first load.
 *
 * Model: Xenova/LaMini-Flan-T5-77M
 *
 * The local provider is intentionally small and self-contained:
 * it receives the already-built TutorContext and turns it into a
 * focused prompt for the on-device model.
 */

import type {
  TutorProvider,
  TutorRequest,
  TutorResponse,
} from '../domain/tutor'

let cachedPipeline: unknown = null
let pipelineLoadFailed = false

const MODEL_LOAD_TIMEOUT_MS = 30000
const INFERENCE_TIMEOUT_MS = 30000

function timeoutPromise<T>(ms: number, label: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    )
  })
}

async function getLocalPipeline(): Promise<unknown | null> {
  if (cachedPipeline) {
    return cachedPipeline
  }

  if (pipelineLoadFailed || typeof WebAssembly === 'undefined') {
    return null
  }

  try {
    const pipelinePromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')

      return pipeline(
        'text2text-generation',
        'Xenova/LaMini-Flan-T5-77M',
        {
          dtype: 'q8',
          device: 'wasm',
        },
      )
    })()

    const pipe = await Promise.race([
      pipelinePromise,
      timeoutPromise(MODEL_LOAD_TIMEOUT_MS, 'Model load'),
    ])

    cachedPipeline = pipe
    return pipe
  } catch (error) {
    console.warn(
      '[tutor] local model load failed/timed out, falling back to rule-based',
      error,
    )

    pipelineLoadFailed = true
    return null
  }
}

export class LocalTutorProvider implements TutorProvider {
  readonly id = 'local' as const

  isAvailable(): boolean {
    return typeof WebAssembly !== 'undefined'
  }

  async respond(request: TutorRequest): Promise<TutorResponse> {
    const { context } = request
    const { prompt, selectedText, material, concepts, weakSpots } = context

    const pipe = await getLocalPipeline()

    if (pipe) {
      try {
        /*
         * Keep the learner's question near the beginning of the prompt.
         * The local model is small, so the question must not be pushed behind
         * large amounts of document context.
         *
         * When text is selected, that selection is the primary evidence.
         * The broader material is supporting context only.
         */
        const promptParts = [
          'You are a study tutor.',
          `Learner question: ${prompt}`,
        ]

        if (selectedText) {
          promptParts.push(
            `Selected passage to explain:\n${selectedText}`,
          )
        }

        if (material?.excerpt && !selectedText) {
          promptParts.push(
            `Material context:\n${material.excerpt.slice(0, 1200)}`,
          )
        }

        if (concepts.length > 0 && !selectedText) {
          promptParts.push(
            `Related concepts: ${concepts
              .slice(0, 3)
              .map((concept) => concept.name)
              .join(', ')}`,
          )
        }

        if (weakSpots.length > 0 && !selectedText) {
          promptParts.push(
            `Relevant review weakness: ${weakSpots[0].conceptName}`,
          )
        }

        promptParts.push(
          selectedText
            ? 'Explain the selected passage clearly and directly. Use the passage as the primary source.'
            : 'Answer using the provided material context.',
          'Answer:',
        )

        const input = promptParts.join('\n\n')

        const generator = pipe as unknown as (
          input: string,
          options?: unknown,
        ) => Promise<Array<{ generated_text: string }>>

        const inferencePromise = generator(input, {
          max_new_tokens: 120,
          temperature: 0.7,
        })

        const output = await Promise.race<
          Array<{ generated_text: string }>
        >([
          inferencePromise,
          timeoutPromise<Array<{ generated_text: string }>>(
            INFERENCE_TIMEOUT_MS,
            'Inference',
          ),
        ])

        const generated = output[0]?.generated_text?.trim()

        if (generated && generated.length > 10) {
          return {
            text: generated,
            provider: 'local',
            execution: 'on-device',
            citation: material
              ? {
                  materialId: material.id,
                  materialTitle: material.title,
                  excerpt: selectedText ?? material.excerpt.slice(0, 120),
                }
              : undefined,
          }
        }
      } catch (error) {
        console.warn(
          '[tutor] local inference failed/timed out, falling back',
          error,
        )
      }
    }

    /*
     * Honest degraded mode.
     *
     * This does not pretend to be generated AI. It preserves useful
     * grounded context when the local model cannot complete inference.
     */
    const parts: string[] = []

    if (selectedText) {
      parts.push(`You highlighted: “${selectedText}”`)
    }

    if (material?.excerpt) {
      const excerptPreview = material.excerpt
        .slice(0, 220)
        .replace(/\s+/g, ' ')
        .trim()

      if (excerptPreview) {
        parts.push(`From “${material.title}”: ${excerptPreview}…`)
      }
    }

    if (weakSpots.length > 0) {
      const weakest = weakSpots[0]

      parts.push(
        `Your review history shows “${weakest.conceptName}” could use reinforcement (${Math.round(
          weakest.rate * 100,
        )}% recall, ${weakest.total} reviews).`,
      )
    }

    if (concepts.length > 0 && !selectedText) {
      const names = concepts
        .slice(0, 3)
        .map((concept) => concept.name)
        .join(', ')

      parts.push(`Linked concepts here: ${names}.`)
    }

    const body =
      parts.length > 0 ? parts.join(' ') : `You asked: “${prompt}”`

    return {
      text: body,
      provider: 'local',
      execution: 'fallback',
      citation: material
        ? {
            materialId: material.id,
            materialTitle: material.title,
            excerpt: selectedText ?? material.excerpt.slice(0, 120),
          }
        : undefined,
    }
  }
}

export const localTutorProvider = new LocalTutorProvider()