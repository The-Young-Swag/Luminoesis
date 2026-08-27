import { z } from 'zod'

import type { Grade } from '#/features/review/domain/sm2'
import { recordReviewEvent } from '#/features/review/application/recordReviewEvent'
import type { Question, QuestionType } from '#/features/quiz/domain/question'
import { createQuizAttemptId } from '#/features/quiz/domain/ids'
import type {
  QuizAttempt,
  QuizAnswerRecord,
} from '#/features/quiz/domain/quizAttempt'
import { quizAttemptRepository } from '#/features/quiz/repositories/quizAttemptRepository'

export type BuildQuizInput = {
  conceptIds: string[]
  questions: Question[]
  maxPerConcept?: number
  limit?: number
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Build a quiz session from a question bank, balanced across concepts.
 * Returns the ordered questions (answers included — this is a local,
 * single-user app, so grading happens client-side before submission).
 */
export function buildQuiz(input: BuildQuizInput): Question[] {
  const { conceptIds, questions, maxPerConcept = 2, limit = 10 } = input

  const byConcept = new Map<string, Question[]>()
  for (const question of questions) {
    if (!conceptIds.includes(question.conceptId)) continue
    const bucket = byConcept.get(question.conceptId) ?? []
    bucket.push(question)
    byConcept.set(question.conceptId, bucket)
  }

  const selected: Question[] = []
  for (const bucket of byConcept.values()) {
    selected.push(...shuffle(bucket).slice(0, maxPerConcept))
  }

  return shuffle(selected).slice(0, limit)
}

export function isAnswerCorrect(question: Question, userAnswer: string): boolean {
  if (question.type === 'short-answer') {
    return (
      userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
    )
  }
  return userAnswer.trim() === question.answer.trim()
}

export type SubmitQuizAnswer = {
  questionId: string
  conceptId: string
  prompt: string
  type: QuestionType
  userAnswer: string
  correct: boolean
  durationMs: number
}

export type SubmitQuizInput = {
  learningSpaceId: string
  conceptIds: string[]
  startedAt: number
  answers: SubmitQuizAnswer[]
}

export type SubmitQuizResult = {
  attempt: QuizAttempt
  correctCount: number
  totalQuestions: number
  /** conceptId -> correct/total, for a "needs work" breakdown. */
  conceptBreakdown: Record<string, { correct: number; total: number }>
}

const SubmitQuizSchema = z.object({
  learningSpaceId: z.string().trim().min(1),
  conceptIds: z.array(z.string().trim().min(1)),
  startedAt: z.number(),
  answers: z.array(
    z.object({
      questionId: z.string().trim().min(1),
      conceptId: z.string().trim().min(1),
      prompt: z.string(),
      type: z.enum(['multiple-choice', 'true-false', 'short-answer']),
      userAnswer: z.string(),
      correct: z.boolean(),
      durationMs: z.number().nonnegative(),
    }),
  ),
})

/**
 * Grades a quiz attempt, writes a concept-aware ReviewEvent per answer (correct
 * -> Easy, incorrect -> Again), and persists the attempt. Correctness is
 * supplied by the runner, which holds the full question bank.
 */
export async function submitQuizAttempt(
  input: SubmitQuizInput,
): Promise<SubmitQuizResult> {
  const data = SubmitQuizSchema.parse(input)

  const now = Date.now()
  const records: QuizAnswerRecord[] = []
  const conceptBreakdown: Record<string, { correct: number; total: number }> =
    {}

  for (const answer of data.answers) {
    const grade: Grade = answer.correct ? 3 : 0

    await recordReviewEvent({
      conceptId: answer.conceptId,
      objectType: 'quiz-question',
      objectId: answer.questionId,
      grade,
      durationMs: answer.durationMs,
    })

    records.push({
      questionId: answer.questionId,
      conceptId: answer.conceptId,
      prompt: answer.prompt,
      type: answer.type,
      userAnswer: answer.userAnswer,
      correct: answer.correct,
      grade,
      durationMs: answer.durationMs,
    })

    const bucket =
      conceptBreakdown[answer.conceptId] ?? { correct: 0, total: 0 }
    bucket.total += 1
    if (answer.correct) bucket.correct += 1
    conceptBreakdown[answer.conceptId] = bucket
  }

  const attempt: QuizAttempt = {
    id: createQuizAttemptId(),
    learningSpaceId: data.learningSpaceId,
    conceptIds: data.conceptIds,
    startedAt: data.startedAt,
    completedAt: now,
    answers: records,
    correctCount: records.filter((record) => record.correct).length,
    totalQuestions: records.length,
    durationMs: Math.max(0, now - data.startedAt),
    createdAt: now,
  }

  await quizAttemptRepository.save(attempt)

  return {
    attempt,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    conceptBreakdown,
  }
}
