import type { Grade } from '#/features/review/domain/sm2'

export type ReviewObjectType =
  | 'flashcard'
  | 'quiz-question'
  | 'brain-trainer'

/**
 * ReviewEvent is the authoritative record of a learner interaction.
 *
 * It is the bridge between any learning object (flashcard, quiz question,
 * brain-trainer item) and the Concept it ultimately strengthens. Mastery is
 * derived from aggregated ReviewEvents keyed by conceptId — never stored on
 * the learning object itself.
 */
export type ReviewEvent = {
  id: string
  conceptId: string
  objectType: ReviewObjectType
  objectId: string
  grade: Grade
  timestamp: number
  durationMs?: number
}
