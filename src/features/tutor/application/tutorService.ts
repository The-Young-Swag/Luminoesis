import type { TutorContext, TutorRequest, TutorResponse, TutorProvider } from '../domain/tutor'
import { buildTutorContext } from '../domain/tutorContext'
import { localTutorProvider } from '../providers/localTutorProvider'

/**
 * TutorService — provider-agnostic orchestration.
 *
 * The application builds a learning context once, then delegates to a
 * provider. Context construction is not duplicated per provider.
 *
 * Local AI is the active provider. Gemini infrastructure is preserved
 * but frozen for future release.
 */
export type TutorServiceOptions = {
  materialId?: string
  materialTitle?: string
  selectedText?: string
  learningSpaceId: string
  prompt: string
  /** Timeout for local provider in ms (default: 20000). */
  localTimeoutMs?: number
}

const DEFAULT_LOCAL_TIMEOUT_MS = 20000

export class TutorService {
  constructor(
    private readonly localProvider: TutorProvider = localTutorProvider,
    // Gemini fetch is preserved but frozen for future release
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
    const timeoutMs = options.localTimeoutMs ?? DEFAULT_LOCAL_TIMEOUT_MS

    // Local AI is the active provider. No Gemini fallback.
    const localAvailable = await this.localProvider.isAvailable()
    if (!localAvailable) {
      return {
        text:
          'Local AI is unavailable. Please ensure your browser supports WebAssembly. All non-AI learning features continue working.',
        provider: 'local',
      }
    }

    try {
      // Race local provider against timeout
      const localPromise = this.localProvider.respond(request)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Local provider timed out')), timeoutMs)
      )
      return await Promise.race([localPromise, timeoutPromise])
    } catch (error) {
      console.warn('[tutor] local provider failed/timed out', error)
      return {
        text:
          'Local AI encountered an error. All non-AI learning features continue working.',
        provider: 'local',
      }
    }
  }
}

export const tutorService = new TutorService()

/**
 * Client helper for Gemini fallback via server API.
 * Preserved but frozen for future release.
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
