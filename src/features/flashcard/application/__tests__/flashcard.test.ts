import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { Flashcard } from '#/features/flashcard/domain/flashcard'

const { flashcardRepository } = vi.hoisted(() => ({
  flashcardRepository: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findByConceptIds: vi.fn(),
  },
}))

const { recordReviewEvent } = vi.hoisted(() => ({
  recordReviewEvent: vi.fn(),
}))

vi.mock('#/features/flashcard/repositories/flashcardRepository', () => ({
  flashcardRepository,
}))

vi.mock('#/features/review/application/recordReviewEvent', () => ({
  recordReviewEvent,
}))

import {
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  gradeFlashcard,
} from '#/features/flashcard/application/flashcard'

function baseFlashcard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'f1',
    conceptId: 'c1',
    front: 'Q',
    back: 'A',
    difficulty: 'medium',
    createdAt: 1,
    updatedAt: 1,
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: '2026-01-01',
    ...overrides,
  }
}

describe('flashcard application', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a flashcard tied to a concept with scheduling defaults', async () => {
    const flashcard = await createFlashcard({
      conceptId: 'c1',
      front: 'Q',
      back: 'A',
      difficulty: 'medium',
    })

    expect(flashcard.conceptId).toBe('c1')
    expect(flashcard.interval).toBe(0)
    expect(flashcard.repetitions).toBe(0)
    expect(flashcard.easeFactor).toBe(2.5)
    expect(flashcard.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(flashcardRepository.create).toHaveBeenCalledOnce()
  })

  it('rejects an empty front', async () => {
    await expect(
      createFlashcard({
        conceptId: 'c1',
        front: ' ',
        back: 'A',
        difficulty: 'easy',
      }),
    ).rejects.toThrow()

    expect(flashcardRepository.create).not.toHaveBeenCalled()
  })

  it('updates a flashcard including its concept', async () => {
    flashcardRepository.findById.mockResolvedValue(baseFlashcard())

    const updated = await updateFlashcard('f1', {
      conceptId: 'c2',
      front: 'Q2',
    })

    expect(flashcardRepository.update).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({
        conceptId: 'c2',
        front: 'Q2',
        updatedAt: expect.any(Number),
      }),
    )
    expect(updated.id).toBe('f1')
  })

  it('grades a flashcard, advances the schedule, and records a concept ReviewEvent', async () => {
    flashcardRepository.findById.mockResolvedValue(baseFlashcard())

    const result = await gradeFlashcard({
      flashcardId: 'f1',
      grade: 2,
      startedAt: 1000,
    })

    expect(flashcardRepository.update).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({
        repetitions: 1,
        interval: 1,
        easeFactor: expect.any(Number),
      }),
    )

    expect(recordReviewEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: 'c1',
        objectType: 'flashcard',
        objectId: 'f1',
        grade: 2,
        durationMs: expect.any(Number),
      }),
    )

    expect(result.conceptId).toBe('c1')
    expect(result.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not record a ReviewEvent when the flashcard is missing', async () => {
    flashcardRepository.findById.mockResolvedValue(undefined)

    await expect(
      gradeFlashcard({ flashcardId: 'missing', grade: 0 }),
    ).rejects.toThrow()

    expect(recordReviewEvent).not.toHaveBeenCalled()
  })

  it('deletes a flashcard', async () => {
    await deleteFlashcard('f1')

    expect(flashcardRepository.delete).toHaveBeenCalledWith('f1')
  })
})
