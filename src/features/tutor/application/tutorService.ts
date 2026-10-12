import type {
  TutorContext,
  TutorRequest,
  TutorResponse,
  TutorProvider,
  TutorConversationMessage,
} from '../domain/tutor'
import { buildTutorContext } from '../domain/tutorContext'
import { localTutorProvider } from '../providers/localTutorProvider'
import { settingsRepository } from '#/shared/repositories/settingsRepository'

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
  conversationHistory?: TutorConversationMessage[]
  localTimeoutMs?: number
  onToken?: (text: string) => void
  modelTier?: 'standard' | 'capable'
  onEscalationStart?: () => void
}

const DEFAULT_LOCAL_TIMEOUT_MS = 20000
const RESPONSE_CACHE_LIMIT = 50

const responseCache = new Map<string, TutorResponse>()

function cacheKey(options: TutorServiceOptions): string {
  const history = options.conversationHistory ?? []
  return [
    options.modelTier ?? 'standard',
    options.materialId ?? '',
    options.selectedText ?? '',
    options.prompt,
    history.length,
    history.at(-1)?.text ?? '',
  ].join('|')
}

function rememberResponse(options: TutorServiceOptions, response: TutorResponse): void {
  if (responseCache.size >= RESPONSE_CACHE_LIMIT) {
    const oldest = responseCache.keys().next()
    if (!oldest.done) responseCache.delete(oldest.value)
  }
  responseCache.set(cacheKey(options), response)
}

/*
 * Opt-in cloud escalation, off by default. Only low-confidence local
 * answers go to Gemini — everything else never leaves the device.
 * Escalated answers are never cached as local ones.
 */
async function maybeEscalate(
  request: TutorRequest,
  localResponse: TutorResponse,
  onToken?: (text: string) => void,
  onEscalationStart?: () => void,
): Promise<TutorResponse | null> {
  if (localResponse.confidence !== 'low') return null

  const escalationOn = await settingsRepository
    .getTutorEscalation()
    .catch(() => false)
  if (!escalationOn) return null

  onEscalationStart?.()

  try {
    return await fetchGeminiTutor(request, { onToken })
  } catch (error) {
    console.warn('[tutor] escalation failed, keeping local answer', error)
    return null
  }
}

export class TutorService {
  constructor(
    private readonly localProvider: TutorProvider = localTutorProvider,
  ) {}

  async ask(options: TutorServiceOptions): Promise<TutorResponse> {
    const cached = responseCache.get(cacheKey(options))
    if (cached) {
      return cached
    }

    const context: TutorContext = await buildTutorContext({
      materialId: options.materialId,
      materialTitle: options.materialTitle,
      selectedText: options.selectedText,
      learningSpaceId: options.learningSpaceId,
      prompt: options.prompt,
      conversationHistory: options.conversationHistory,
    })

    const request: TutorRequest = { context }
    const timeoutMs = options.localTimeoutMs ?? DEFAULT_LOCAL_TIMEOUT_MS
    const tier =
      options.modelTier ?? (await settingsRepository.getLocalModelTier().catch(() => 'standard' as const))

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
      const localPromise = this.localProvider.respond(request, {
        onToken: options.onToken,
        tier,
      })
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Local provider timed out')),
          timeoutMs,
        )
      })
      const response = await Promise.race([localPromise, timeoutPromise])

      const escalated = await maybeEscalate(
        request,
        response,
        options.onToken,
        options.onEscalationStart,
      )
      if (escalated) {
        return escalated
      }

      // Low-confidence answers stay out of the cache so a repeat visit
      // still gets its chance at escalation.
      if (response.confidence !== 'low') {
        rememberResponse(options, response)
      }
      return response
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
const GEMINI_STREAM_TIMEOUT_MS = 90000

export async function fetchGeminiTutor(
  request: TutorRequest,
  options?: { onToken?: (text: string) => void },
): Promise<TutorResponse> {
  const base = import.meta.env.VITE_SYNC_URL ?? 'http://localhost:4901'
  const url = `${base.replace(/\/$/, '')}/tutor/chat`

  const body = JSON.stringify({
    prompt: request.context.prompt,
    selectedText: request.context.selectedText,
    materialId: request.context.material?.id,
    materialTitle: request.context.material?.title,
    excerpt: request.context.material?.excerpt.slice(0, 4000),
    concepts: request.context.concepts.slice(0, 8),
    weakSpots: request.context.weakSpots,
  })

  const streamed = await tryGeminiStream(`${url}/stream`, body, options?.onToken)
  if (streamed !== null) return streamed

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(
      (data as { error?: string }).error ?? `Tutor request failed: ${response.status}`,
    )
  }

  const data = (await response.json()) as {
    text: string
    citation?: TutorResponse['citation']
  }
  return {
    text: data.text,
    provider: 'gemini',
    confidence: 'high',
    citation: data.citation,
  }
}

async function tryGeminiStream(
  url: string,
  body: string,
  onToken?: (text: string) => void,
): Promise<TutorResponse | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), GEMINI_STREAM_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      credentials: 'include',
      body,
      signal: controller.signal,
    })

    if (!response.ok || !response.body) return null

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let citation: TutorResponse['citation']

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload) continue

        let event: {
          token?: string
          done?: boolean
          error?: string
          citation?: TutorResponse['citation']
        }
        try {
          event = JSON.parse(payload)
        } catch {
          // Split across TCP chunks — put the line back and keep buffering.
          buffer = `${line}\n${buffer}`
          continue
        }

        if (event.error) throw new Error(event.error)
        if (event.token) {
          fullText += event.token
          onToken?.(event.token)
        }
        if (event.citation) citation = event.citation
        if (event.done) {
          const text = fullText.trim()
          if (!text) throw new Error('Online Tutor returned an empty response.')
          return { text, provider: 'gemini', confidence: 'high', citation }
        }
      }
    }

    return null
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}