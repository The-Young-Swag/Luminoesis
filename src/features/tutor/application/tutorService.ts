import type { TutorContext, TutorRequest, TutorResponse, TutorProvider } from '../domain/tutor'
import { buildTutorContext } from '../domain/tutorContext'
import { localTutorProvider } from '../providers/localTutorProvider'

/**
 * TutorService — provider-agnostic orchestration.
 *
 * The application builds a learning context once, then delegates to a
 * provider. Context construction is not duplicated per provider.
 *
 * Today the service prefers the local provider. Gemini fallback is
 * server-mediated (never from the browser) and quota-gated — see
 * `src/server/http/routes/tutor.ts`.
 */
export type TutorServiceOptions = {
  materialId?: string
  materialTitle?: string
  selectedText?: string
  learningSpaceId: string
  prompt: string
  /** Force a specific provider; default is local-first. */
  prefer?: 'local' | 'gemini'
}

export class TutorService {
  constructor(
    private readonly localProvider: TutorProvider = localTutorProvider,
    private readonly geminiFetch?: (request: TutorRequest) => Promise<TutorResponse>,
  ) {}

  async ask(options: TutorServiceOptions): Promise<TutorResponse> {
    const context: TutorContext = await buildTutorContext({
      materialId: options.materialId,
      materialTitle: options.materialTitle,
      selectedText: options.selectedText,
      learningSpaceId: options.learningSpaceId,
      prompt: options.prompt,
    })

    const request: TutorRequest = { context }

    // Local first — offline, private, zero cost.
    if (options.prefer !== 'gemini') {
      const localAvailable = await this.localProvider.isAvailable()
      if (localAvailable) {
        return this.localProvider.respond(request)
      }
    }

    // Gemini fallback via server boundary (never expose key to browser).
    if (this.geminiFetch) {
      return this.geminiFetch(request)
    }

    // No provider available — honest fallback, never fake.
    return {
      text:
        'AI tutoring isn’t connected in this build yet — but your material, concepts, highlights and review history are all captured here, so a tutor can use them the moment it’s enabled. All non-AI learning features continue working.',
      provider: 'local',
    }
  }
}

export const tutorService = new TutorService()

/**
 * Client helper for Gemini fallback via server API.
 * Keeps GEMINI_API_KEY server-side; browser only talks to our /tutor/chat.
 */
export async function fetchGeminiTutor(request: TutorRequest): Promise<TutorResponse> {
  const base = import.meta.env.VITE_SYNC_URL ?? 'http://localhost:4901'
  const url = `${base.replace(/\/$/, '')}/tutor/chat`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      prompt: request.context.prompt,
      selectedText: request.context.selectedText,
      materialId: request.context.material?.id,
      materialTitle: request.context.material?.title,
      excerpt: request.context.material?.excerpt?.slice(0, 4000),
      concepts: request.context.concepts.slice(0, 8),
      weakSpots: request.context.weakSpots,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `Tutor request failed: ${response.status}`)
  }

  const data = await response.json()
  return {
    text: data.text,
    provider: 'gemini',
    citation: data.citation,
  }
}
