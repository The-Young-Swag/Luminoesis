/**
 * Tutor domain — provider-agnostic types.
 *
 * The application builds a provider-independent learning context and then
 * delegates to a TutorProvider. This keeps provider-specific behavior out
 * of React components and makes context construction reusable.
 */

export type TutorRole = 'user' | 'assistant'

export type TutorMessage = {
  id: string
  role: TutorRole
  text: string

  /**
   * The exact passage the learner selected when asking this question.
   *
   * Keeping it on the message preserves the relationship between the
   * learner's question and the evidence that was sent to the Tutor.
   */
  selectedText?: string

  provider?: 'local' | 'gemini'

  /**
   * Describes how a Local AI response was produced.
   *
   * `on-device` means the actual local model generated the response.
   * `fallback` means the local model was unavailable and the provider
   * returned its honest degraded response instead.
   */
  execution?: 'on-device' | 'fallback'

  citation?: TutorCitation
}

export type TutorCitation = {
  materialId: string
  materialTitle: string
  excerpt?: string
}

export type TutorContext = {
  /** The material the user is currently viewing, if any. */
  material?: {
    id: string
    title: string
    excerpt: string
    source: 'user' | 'extracted'
  }

  /** The exact selected text that triggered the tutor request. */
  selectedText?: string

  /** Concepts linked to the current material / learning space. */
  concepts: Array<{
    id: string
    name: string
    description?: string
  }>

  /** Highlights from this material (provenance). */
  highlights: Array<{
    id: string
    text: string
    note?: string
  }>

  /** Recent review history for weak-spot analysis. */
  reviewHistory: Array<{
    conceptId: string
    conceptName: string
    grade: number
    timestamp: number
  }>

  /** Derived weak spots (concept-level retention). */
  weakSpots: Array<{
    conceptId: string
    conceptName: string
    rate: number
    total: number
  }>

  /** The user's prompt. */
  prompt: string
}

export type TutorRequest = {
  context: TutorContext
}

export type TutorResponse = {
  text: string
  provider: 'local' | 'gemini'

  /**
   * Indicates how the Local provider produced the response.
   * Gemini does not currently use this field.
   */
  execution?: 'on-device' | 'fallback'

  citation?: TutorCitation
}

export type TutorProviderId = 'local' | 'gemini'

export interface TutorProvider {
  readonly id: TutorProviderId

  /** Whether this provider can handle a request in the current environment. */
  isAvailable: () => boolean | Promise<boolean>

  respond: (request: TutorRequest) => Promise<TutorResponse>
}

export const MAX_CONTEXT_CHARS = 4000
export const MAX_PROMPT_CHARS = 2000
export const MAX_SELECTED_TEXT_CHARS = 800

export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }

  return `${text.slice(0, max - 1)}…`
}