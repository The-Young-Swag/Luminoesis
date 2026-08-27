export type FlashcardDifficulty = 'easy' | 'medium' | 'hard'

/**
 * A Flashcard is a retrieval prompt tied to a Concept.
 *
 * It deliberately does NOT own mastery. Scheduling fields (interval,
 * repetitions, easeFactor, dueDate) are the spaced-repetition plan for this
 * specific prompt; mastery of the underlying Concept is derived from
 * ReviewEvents, never stored here.
 */
export type Flashcard = {
  id: string
  conceptId: string
  front: string
  back: string
  difficulty: FlashcardDifficulty
  materialId?: string
  highlightId?: string
  createdAt: number
  updatedAt: number
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: string
  lastReviewed?: string
}
