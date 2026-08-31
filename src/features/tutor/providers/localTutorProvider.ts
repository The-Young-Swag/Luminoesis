import type {
  TutorProvider,
  TutorRequest,
  TutorResponse,
} from '../domain/tutor'

/**
 * Lazy on-device pipeline cached after the first successful load.
 *
 * The model runs through Transformers.js and WebAssembly, so the Tutor
 * does not send the learning context to an external AI provider.
 */
const MODEL_ID = 'Xenova/LaMini-Flan-T5-77M'

const MODEL_LOAD_TIMEOUT_MS = 15_000
const INFERENCE_TIMEOUT_MS = 30_000

type TextGenerationResult = {
  generated_text: string
}

type TextGenerationOptions = {
  max_new_tokens: number
  temperature: number
}

type TextGenerator = (
  input: string,
  options: TextGenerationOptions,
) => Promise<TextGenerationResult[]>

let cachedPipeline: TextGenerator | null = null
let pipelineLoadFailed = false

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeout])
}

async function loadLocalPipeline(): Promise<TextGenerator | null> {
  if (cachedPipeline) {
    return cachedPipeline
  }

  if (pipelineLoadFailed || typeof WebAssembly === 'undefined') {
    return null
  }

  try {
    const { pipeline } = await import('@huggingface/transformers')

    const pipelinePromise = pipeline(
      'text2text-generation',
      MODEL_ID,
      {
        dtype: 'q8',
        device: 'wasm',
      },
    )

    const pipelineInstance = await withTimeout(
      pipelinePromise as Promise<TextGenerator>,
      MODEL_LOAD_TIMEOUT_MS,
      'Local model load',
    )

    cachedPipeline = pipelineInstance

    return pipelineInstance
  } catch (error) {
    pipelineLoadFailed = true

    console.warn(
      '[tutor] Local model load failed or timed out.',
      error,
    )

    return null
  }
}

export class LocalTutorProvider implements TutorProvider {
  readonly id = 'local' as const

  isAvailable(): boolean {
    return typeof WebAssembly !== 'undefined'
  }

  async respond(request: TutorRequest): Promise<TutorResponse> {
    const {
      prompt,
      selectedText,
      material,
      concepts,
      weakSpots,
    } = request.context

    const pipeline = await loadLocalPipeline()

    if (pipeline) {
      try {
        const contextParts: string[] = []

        if (material?.excerpt) {
          contextParts.push(
            `Context: ${material.excerpt.slice(0, 800)}`,
          )
        }

        if (selectedText) {
          contextParts.push(`Selected: ${selectedText}`)
        }

        if (concepts.length > 0) {
          const conceptNames = concepts
            .slice(0, 3)
            .map((concept) => concept.name)
            .join(', ')

          contextParts.push(`Concepts: ${conceptNames}`)
        }

        if (weakSpots.length > 0) {
          contextParts.push(
            `Weak spot: ${weakSpots[0].conceptName}`,
          )
        }

        const input = [
          ...contextParts,
          `Question: ${prompt}`,
          'Answer:',
        ].join('\n')

        const output = await withTimeout(
          pipeline(input, {
            max_new_tokens: 120,
            temperature: 0.7,
          }),
          INFERENCE_TIMEOUT_MS,
          'Local inference',
        )

        const generatedText = output[0]?.generated_text?.trim()

        if (generatedText && generatedText.length > 10) {
          return {
            text: `${generatedText}

— Local model · Generated on-device via ${MODEL_ID}. No data sent externally.`,
            provider: 'local',
            citation: material
              ? {
                  materialId: material.id,
                  materialTitle: material.title,
                  excerpt:
                    selectedText ?? material.excerpt.slice(0, 120),
                }
              : undefined,
          }
        }
      } catch (error) {
        console.warn(
          '[tutor] Local inference failed or timed out.',
          error,
        )
      }
    }

    return createGroundedPreview(request)
  }
}

function createGroundedPreview(
  request: TutorRequest,
): TutorResponse {
  const {
    prompt,
    selectedText,
    material,
    concepts,
    weakSpots,
  } = request.context

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
      parts.push(
        `From “${material.title}”: ${excerptPreview}…`,
      )
    }
  }

  if (weakSpots.length > 0) {
    const weakestConcept = weakSpots[0]

    parts.push(
      `Your review history shows “${weakestConcept.conceptName}” could use reinforcement (${Math.round(
        weakestConcept.rate * 100,
      )}% recall, ${weakestConcept.total} reviews).`,
    )
  }

  if (concepts.length > 0 && !selectedText) {
    const conceptNames = concepts
      .slice(0, 3)
      .map((concept) => concept.name)
      .join(', ')

    parts.push(`Linked concepts here: ${conceptNames}.`)
  }

  const body =
    parts.length > 0
      ? parts.join(' ')
      : `You asked: “${prompt}”`

  return {
    text: [
      body,
      '',
      '— Local preview · This answer was built on-device from your material, selection, and review history. No data was sent externally.',
    ].join('\n'),
    provider: 'local',
    citation: material
      ? {
          materialId: material.id,
          materialTitle: material.title,
          excerpt:
            selectedText ?? material.excerpt.slice(0, 120),
        }
      : undefined,
  }
}

export const localTutorProvider = new LocalTutorProvider()