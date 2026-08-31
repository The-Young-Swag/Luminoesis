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
export class LocalTutorProvider implements TutorProvider {
  readonly id = 'local' as const

  isAvailable(): boolean {
    // Rule-based preview is always available. A future model-backed
    // implementation would check for WebGPU/WASM support and model cache.
    return true
  }

  async respond(request: TutorRequest): Promise<TutorResponse> {
    const { context } = request
    const { prompt, selectedText, material, concepts, weakSpots } = context

    // Build a grounded, context-aware preview without fabricating facts.
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

    // Weak-spot hint if relevant
    if (weakSpots.length > 0) {
      const weakest = weakSpots[0]
      parts.push(
        `Your review history shows “${weakest.conceptName}” could use reinforcement (${Math.round(weakest.rate * 100)}% recall, ${weakest.total} reviews).`,
      )
    }

    // Concept grounding
    if (concepts.length > 0 && !selectedText) {
      const names = concepts.slice(0, 3).map((concept) => concept.name).join(', ')
      parts.push(`Linked concepts here: ${names}.`)
    }

    // Honest boundary: this is a preview, not a full LLM, and it's offline.
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
