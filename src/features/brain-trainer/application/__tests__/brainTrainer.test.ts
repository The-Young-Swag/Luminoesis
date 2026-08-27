import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  buildBrainTrainerQueue,
  submitBrainTrainerAnswer,
} from '#/features/brain-trainer/application/brainTrainer'

const { recordReviewEvent } = vi.hoisted(() => ({
  recordReviewEvent: vi.fn(),
}))

vi.mock('#/features/review/application/recordReviewEvent', () => ({
  recordReviewEvent,
}))

describe('buildBrainTrainerQueue', () => {
  const dueFlashcards = [
    { id: 'f1', conceptId: 'c1', front: 'Q1', back: 'A1' },
    { id: 'f2', conceptId: 'c1', front: 'Q2', back: 'A2' },
    { id: 'f3', conceptId: 'c2', front: 'Q3', back: 'A3' },
  ]
  const questions = [
    { id: 'q1', conceptId: 'c1', prompt: 'p1', answer: 'a1', type: 'multiple-choice' as const },
    { id: 'q2', conceptId: 'c2', prompt: 'p2', answer: 'a2', type: 'true-false' as const },
    { id: 'q3', conceptId: 'c3', prompt: 'p3', answer: 'a3', type: 'short-answer' as const },
  ]

  it('merges flashcards and questions and respects the total limit', () => {
    const queue = buildBrainTrainerQueue({
      dueFlashcards,
      questions,
      flashcardLimit: 2,
      questionLimit: 1,
      totalLimit: 10,
    })

    expect(queue.length).toBe(3)
    expect(queue.filter((item) => item.kind === 'flashcard').length).toBe(2)
    expect(queue.filter((item) => item.kind === 'question').length).toBe(1)
  })

  it('maps flashcards and questions to concept-scoped items', () => {
    const queue = buildBrainTrainerQueue({
      dueFlashcards: [dueFlashcards[0]],
      questions: [questions[0]],
      totalLimit: 10,
    })

    const flashcard = queue.find((item) => item.kind === 'flashcard')
    expect(flashcard?.conceptId).toBe('c1')
    expect(flashcard?.prompt).toBe('Q1')
    expect(flashcard?.answer).toBe('A1')
  })
})

describe('submitBrainTrainerAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records a brain-trainer ReviewEvent for the concept', async () => {
    await submitBrainTrainerAnswer({
      item: { id: 'f1', conceptId: 'c1' },
      grade: 2,
      durationMs: 4000,
    })

    expect(recordReviewEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: 'c1',
        objectType: 'brain-trainer',
        objectId: 'f1',
        grade: 2,
        durationMs: 4000,
      }),
    )
  })
})
