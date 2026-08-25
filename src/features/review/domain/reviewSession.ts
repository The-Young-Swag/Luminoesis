export type ReviewSession = {
  id: string
  cardId: string
  sessionId: string
  timestamp: string
  grade: number
  durationMs?: number
}