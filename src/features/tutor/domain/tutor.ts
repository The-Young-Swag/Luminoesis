export type TutorRole = 'user' | 'assistant'

export type TutorExecution = 'on-device' | 'fallback'

export type TutorMessage = {
  id: string
  role: TutorRole
  text: string
  provider?: 'local' | 'gemini'
  execution?: TutorExecution
  citation?: TutorCitation
  selectedText?: string
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
}

export type TutorProviderId = 'local' | 'gemini'

export interface TutorProvider {
  readonly id: TutorProviderId
  isAvailable: () => boolean | Promise<boolean>
  respond: (request: TutorRequest) => Promise<TutorResponse>
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