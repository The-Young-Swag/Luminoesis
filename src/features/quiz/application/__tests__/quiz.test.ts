import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { Question } from '#/features/quiz/domain/question'
import {
  buildQuiz,
  isAnswerCorrect,
  submitQuizAttempt,
} from '#/features/quiz/application/quiz'
import { createQuestion } from '#/features/quiz/application/question'

const { questionRepository } = vi.hoisted(() => ({
  questionRepository: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    getByConceptIds: vi.fn(),
  },
}))

const { quizAttemptRepository } = vi.hoisted(() => ({
  quizAttemptRepository: {
    save: vi.fn(),
    getByLearningSpace: vi.fn(),
    getRecent: vi.fn(),
  },
}))

const { recordReviewEvent } = vi.hoisted(() => ({
  recordReviewEvent: vi.fn(),
}))

vi.mock('#/features/quiz/repositories/questionRepository', () => ({
  questionRepository,
}))

vi.mock('#/features/quiz/repositories/quizAttemptRepository', () => ({
  quizAttemptRepository,
}))

vi.mock('#/features/review/application/recordReviewEvent', () => ({
  recordReviewEvent,
}))

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    conceptId: 'c1',
    prompt: 'p',
    type: 'multiple-choice',
    choices: ['A', 'B'],
    answer: 'A',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('quiz domain helpers', () => {
  it('builds a balanced quiz within the limit', () => {
    const questions = [
      question({ id: 'q1', conceptId: 'c1' }),
      question({ id: 'q2', conceptId: 'c1' }),
      question({ id: 'q3', conceptId: 'c2' }),
      question({ id: 'q4', conceptId: 'c3' }),
    ]

    const session = buildQuiz({
      conceptIds: ['c1', 'c2'],
      questions,
      maxPerConcept: 1,
      limit: 10,
    })

    expect(session.length).toBe(2)
    expect(session.every((q) => ['c1', 'c2'].includes(q.conceptId))).toBe(true)
  })

  it('respects maxPerConcept', () => {
    const questions = [
      question({ id: 'q1', conceptId: 'c1' }),
      question({ id: 'q2', conceptId: 'c1' }),
      question({ id: 'q3', conceptId: 'c1' }),
    ]

    const session = buildQuiz({
      conceptIds: ['c1'],
      questions,
      maxPerConcept: 2,
      limit: 10,
    })

    expect(session.length).toBe(2)
  })

  it('scores answers by type', () => {
    expect(
      isAnswerCorrect(question({ type: 'multiple-choice', answer: 'A' }), 'A'),
    ).toBe(true)
    expect(
      isAnswerCorrect(question({ type: 'true-false', answer: 'True' }), 'True'),
    ).toBe(true)
    expect(
      isAnswerCorrect(
        question({ type: 'short-answer', answer: 'Paris' }),
        'paris',
      ),
    ).toBe(true)
    expect(
      isAnswerCorrect(question({ type: 'short-answer', answer: 'Paris' }), 'Rome'),
    ).toBe(false)
  })
})

describe('question application', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates that the answer is one of the choices', async () => {
    await expect(
      createQuestion({
        conceptId: 'c1',
        prompt: 'Capital of France?',
        type: 'multiple-choice',
        choices: ['Paris', 'Rome'],
        answer: 'Berlin',
      }),
    ).rejects.toThrow()

    expect(questionRepository.create).not.toHaveBeenCalled()
  })

  it('creates a valid question', async () => {
    questionRepository.create.mockImplementation(async (q: Question) => q)

    const created = await createQuestion({
      conceptId: 'c1',
      prompt: 'Capital of France?',
      type: 'multiple-choice',
      choices: ['Paris', 'Rome'],
      answer: 'Paris',
    })

    expect(created.answer).toBe('Paris')
    expect(questionRepository.create).toHaveBeenCalledOnce()
  })
})

describe('submitQuizAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records a ReviewEvent per answer and persists the attempt', async () => {
    const result = await submitQuizAttempt({
      learningSpaceId: 'ls1',
      conceptIds: ['c1', 'c2'],
      startedAt: 1000,
      answers: [
        {
          questionId: 'q1',
          conceptId: 'c1',
          prompt: 'p1',
          type: 'multiple-choice',
          userAnswer: 'A',
          correct: true,
          durationMs: 5000,
        },
        {
          questionId: 'q2',
          conceptId: 'c2',
          prompt: 'p2',
          type: 'true-false',
          userAnswer: 'False',
          correct: false,
          durationMs: 3000,
        },
      ],
    })

    expect(recordReviewEvent).toHaveBeenCalledTimes(2)
    expect(recordReviewEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: 'c1',
        objectType: 'quiz-question',
        objectId: 'q1',
        grade: 3,
      }),
    )
    expect(recordReviewEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: 'c2',
        objectType: 'quiz-question',
        objectId: 'q2',
        grade: 0,
      }),
    )

    expect(quizAttemptRepository.save).toHaveBeenCalledOnce()
    expect(result.correctCount).toBe(1)
    expect(result.totalQuestions).toBe(2)
    expect(result.conceptBreakdown['c1']).toEqual({ correct: 1, total: 1 })
    expect(result.conceptBreakdown['c2']).toEqual({ correct: 0, total: 1 })
  })
})
