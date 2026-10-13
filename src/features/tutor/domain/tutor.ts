import type { WebSource } from './webRetrieval'

export type TutorRole = 'user' | 'assistant'

export type TutorExecution = 'on-device' | 'fallback'

/*
 * 'local' runs SmolLM2 on-device (current default, always available
 * offline). 'online' additionally allows web retrieval + a server-side
 * LLM call — see webRetrieval.ts and the architecture note in
 * tutorService.ts. Not yet wired into TutorService/TutorPanel; this type
 * exists so provider and UI work can build against a stable contract
 * once the server-side endpoint is ready.
 */
export type TutorMode = 'local' | 'online'

export type TutorMessage = {
  id: string
  role: TutorRole
  text: string
  provider?: 'local' | 'gemini'
  execution?: TutorExecution
  citation?: TutorCitation
  selectedText?: string
  notice?: string
}

export type TutorConversationMessage = {
  role: TutorRole
  text: string
  selectedText?: string
}

export type TutorCitation = {
  materialId: string
  materialTitle: string
  excerpt?: string
}

export type TutorContext = {
  material?: {
    id: string
    title: string
    excerpt: string
    source: 'user' | 'extracted'
  }

  selectedText?: string

  concepts: Array<{
    id: string
    name: string
    description?: string
  }>

  highlights: Array<{
    id: string
    text: string
    note?: string
  }>

  reviewHistory: Array<{
    conceptId: string
    conceptName: string
    grade: number
    timestamp: number
  }>

  weakSpots: Array<{
    conceptId: string
    conceptName: string
    rate: number
    total: number
  }>

  conversationHistory: TutorConversationMessage[]

  prompt: string
}

export type TutorRequest = {
  context: TutorContext
}

export type TutorResponse = {
  text: string
  provider: 'local' | 'gemini'
  execution?: TutorExecution
  citation?: TutorCitation
  /*
   * Local confidence in the answer. 'low' means validators rejected the
   * generation and the text is a safe fallback — the signal escalation
   * uses to decide whether the cloud is worth asking. Absent on provider
   * paths that predate the signal; treat absent as 'high'.
   */
  confidence?: 'high' | 'low'
  /*
   * Populated only by Online Mode when web retrieval contributed to the
   * answer. Always the real sources webRetrieval.ts returned — titles and
   * URLs are never fabricated. Lets the UI attribute material vs. web vs.
   * model knowledge using the same citation-style pattern already in use,
   * rather than a separate provenance system.
   */
  webSources?: WebSource[]
  /*
   * Set when cloud escalation was attempted but failed: the local answer
   * still stands, and this plain-language note explains why. Rendered as
   * a caption under the answer — never technical, never a stack trace.
   */
  notice?: string
}

export type TutorProviderId = 'local' | 'gemini'

export type TutorRespondOptions = {
  onToken?: (text: string) => void
  tier?: 'standard' | 'capable'
}

export interface TutorProvider {
  readonly id: TutorProviderId
  isAvailable: () => boolean | Promise<boolean>
  respond: (request: TutorRequest, options?: TutorRespondOptions) => Promise<TutorResponse>
}

export const MAX_CONTEXT_CHARS = 4000
export const MAX_PROMPT_CHARS = 2000
export const MAX_SELECTED_TEXT_CHARS = 800
export const MAX_CONVERSATION_MESSAGES = 6

export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }

  return `${text.slice(0, max - 1)}…`
}