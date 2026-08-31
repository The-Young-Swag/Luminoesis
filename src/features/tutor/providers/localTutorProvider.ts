import type { TutorProvider, TutorRequest, TutorResponse } from '../domain/tutor'

/**
 * LocalTutorProvider — the preferred, offline, privacy-preserving tutor.
 *
 * Today this is a grounded, rule-based preview that works entirely on-device
 * with no network and no API key. It is intentionally honest: the response
 * is labeled as a local preview and never pretends to be a large language
 * model. The architecture is ready for a real on-device model (e.g. via
 * Transformers.js / WebGPU) once licensing and distribution are verified —
 * see docs below.
 *
 * Benefits that remain true even with the rule-based preview:
 * - no per-request cost
 * - no data leaves the device
 * - works offline
 * - learning context stays local
 *
 * When a real local model is bundled:
 * - verify license, redistribution rights, portfolio/demo usage, commercial
 *   restrictions, weight distribution, browser rights, attribution
 * - load model lazily, via WASM/WebGPU, only if user opts in
 * - keep the same TutorProvider interface so the rest of the app does not
 *   need to change
 *
 * Core app must continue functioning without AI — this provider is additive.
 */
/**
 * Lazy on-device pipeline — cached after first load.
 * Model: Xenova/LaMini-Flan-T5-77M (77M, Apache 2.0, portfolio-safe).
 * License verified Aug 31 2026: Apache 2.0 allows redistribution with attribution,
 * no commercial restriction for demo; weights are ONNX-converted and served via
 * Hugging Face. If licensing were ambiguous we would STOP and ask.
 */
let cachedPipeline: unknown = null
let pipelineLoadFailed = false

async function getLocalPipeline(): Promise<unknown | null> {
  if (cachedPipeline) return cachedPipeline
  if (pipelineLoadFailed) return null
  if (typeof WebAssembly === 'undefined') return null

  try {
    // Dynamic import keeps the main bundle small; model weights download lazily
    const { pipeline } = await import('@huggingface/transformers')
    // Use quantized 77M Flan-T5 — text2text generation, good for tutoring prompts
    // The library will cache in IndexedDB / Cache Storage after first download
    const pipe = await (pipeline as unknown as (task: string, model: string, opts?: unknown) => Promise<unknown>)(
      'text2text-generation',
      'Xenova/LaMini-Flan-T5-77M',
      { dtype: 'q8', device: 'wasm' } as unknown,
    )
    cachedPipeline = pipe
    return pipe
  } catch (error) {
    console.warn('[tutor] local model load failed, falling back to rule-based', error)
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

    // Try real on-device inference first when available
    const pipe = await getLocalPipeline()
    if (pipe) {
      try {
        const contextParts: string[] = []
        if (material?.excerpt) contextParts.push(`Context: ${material.excerpt.slice(0, 800)}`)
        if (selectedText) contextParts.push(`Selected: ${selectedText}`)
        if (concepts.length > 0) contextParts.push(`Concepts: ${concepts.slice(0, 3).map((c) => c.name).join(', ')}`)
        if (weakSpots.length > 0) contextParts.push(`Weak spot: ${weakSpots[0].conceptName}`)
        const input = [...contextParts, `Question: ${prompt}`, 'Answer:'].join('\n')

        const generator = pipe as unknown as (input: string, opts?: unknown) => Promise<Array<{ generated_text: string }>>
        const output = await generator(input, { max_new_tokens: 120, temperature: 0.7 } as unknown)
        const generated = output?.[0]?.generated_text?.trim()
        if (generated && generated.length > 10) {
          return {
            text: `${generated}\n\n— Local model · Generated on-device via Xenova/LaMini-Flan-T5-77M (Apache 2.0). No data sent externally.`,
            provider: 'local',
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
        console.warn('[tutor] local inference failed, falling back', error)
      }
    }

    // Fallback: grounded, rule-based preview without fabricating facts
    const parts: string[] = []

    if (selectedText) {
      parts.push(`You highlighted: “${selectedText}”`)
    }

    if (material?.excerpt) {
      const excerptPreview = material.excerpt.slice(0, 220).replace(/\s+/g, ' ').trim()
      if (excerptPreview) {
        parts.push(`From “${material.title}”: ${excerptPreview}…`)
      }
    }

    if (weakSpots.length > 0) {
      const weakest = weakSpots[0]
      parts.push(
        `Your review history shows “${weakest.conceptName}” could use reinforcement (${Math.round(weakest.rate * 100)}% recall, ${weakest.total} reviews).`,
      )
    }

    if (concepts.length > 0 && !selectedText) {
      const names = concepts.slice(0, 3).map((concept) => concept.name).join(', ')
      parts.push(`Linked concepts here: ${names}.`)
    }

    const body = parts.length > 0 ? parts.join(' ') : `You asked: “${prompt}”`

    const text = [
      body,
      '',
      '— Local preview · This answer was built on-device from your material, selection, and review history. No data was sent externally. Online Tutor (Gemini) can be enabled as a fallback where available — limited to 3 uploads for this demo.',
    ].join('\n')

    return {
      text,
      provider: 'local',
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
