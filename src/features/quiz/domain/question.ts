import type { MaterialId, ConceptId } from '#/features/learning-space/domain/learningSpace'

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer'

export type Question = {
  id: string
  conceptId: ConceptId
  materialId?: MaterialId
  prompt: string
  type: QuestionType
  /** Present for 'multiple-choice' and 'true-false'. */
  choices?: string[]
  /** The correct answer. For 'short-answer' this is the reference answer. */
  answer: string
  explanation?: string
  createdAt: number
  updatedAt: number
}
