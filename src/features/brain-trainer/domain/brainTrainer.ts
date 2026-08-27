import type { QuestionType } from '#/features/quiz/domain/question'

/**
 * A unified recall item for the Brain Trainer. It blends due flashcards and
 * quiz questions into a single quick-fire drill. Every item is concept-scoped
 * so the resulting ReviewEvent feeds the same concept-mastery bridge.
 */
export type BrainTrainerItem = {
  id: string
  kind: 'flashcard' | 'question'
  conceptId: string
  prompt: string
  answer: string
  questionType?: QuestionType
}
