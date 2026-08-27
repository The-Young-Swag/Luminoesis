import type { Grade } from '#/features/review/domain/sm2'
import type { QuestionType } from '#/features/quiz/domain/question'

export type QuizAnswerRecord = {
  questionId: string
  conceptId: string
  prompt: string
  type: QuestionType
  userAnswer: string
  correct: boolean
  /** SM-2 grade derived from correctness, written to the concept ReviewEvent. */
  grade: Grade
  durationMs: number
}

export type QuizAttempt = {
  id: string
  learningSpaceId: string
  /** The concepts this quiz was scoped to. */
  conceptIds: string[]
  startedAt: number
  completedAt: number
  answers: QuizAnswerRecord[]
  correctCount: number
  totalQuestions: number
  durationMs: number
  createdAt: number
}
