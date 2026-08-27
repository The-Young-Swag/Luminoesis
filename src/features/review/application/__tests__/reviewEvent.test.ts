import { describe, expect, it, vi, beforeEach } from 'vitest'

const { reviewEventRepository } = vi.hoisted(() => ({
  reviewEventRepository: {
    create: vi.fn(),
  },
}))

vi.mock('#/features/review/repositories/reviewEventRepository', () => ({
  reviewEventRepository,
}))

import { recordReviewEvent } from '#/features/review/application/recordReviewEvent'

type RecordInput = Parameters<typeof recordReviewEvent>[0]

describe('reviewEvent application', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records a concept-aware review event', async () => {
    const event = await recordReviewEvent({
      conceptId: 'c1',
      objectType: 'flashcard',
      objectId: 'f1',
      grade: 3,
    })

    expect(event.conceptId).toBe('c1')
    expect(event.objectType).toBe('flashcard')
    expect(event.objectId).toBe('f1')
    expect(event.grade).toBe(3)
    expect(event.timestamp).toBeTypeOf('number')
    expect(reviewEventRepository.create).toHaveBeenCalledOnce()
  })

  it('rejects an invalid grade', async () => {
    await expect(
      recordReviewEvent({
        conceptId: 'c1',
        objectType: 'flashcard',
        objectId: 'f1',
        grade: 9,
      } as unknown as RecordInput),
    ).rejects.toThrow()

    expect(reviewEventRepository.create).not.toHaveBeenCalled()
  })

  it('rejects a missing conceptId', async () => {
    await expect(
      recordReviewEvent({
        conceptId: '',
        objectType: 'flashcard',
        objectId: 'f1',
        grade: 0,
      }),
    ).rejects.toThrow()

    expect(reviewEventRepository.create).not.toHaveBeenCalled()
  })
})
