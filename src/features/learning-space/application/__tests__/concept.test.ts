import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { Concept } from '#/features/learning-space/domain/learningSpace'

import {
  createConcept,
  updateConcept,
  deleteConcept,
} from '#/features/learning-space/application/concept'

const { repository } = vi.hoisted(() => ({
  repository: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('#/features/learning-space/domain/ids', () => ({
  createConceptId: () => 'concept-id',
}))

vi.mock(
  '#/features/learning-space/repositories/conceptRepository',
  () => ({
    conceptRepository: repository,
  }),
)

describe('concept application', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a concept with defaults and timestamps', async () => {
    const concept = await createConcept({
      learningSpaceId: 'space-1',
      name: 'Cardiac output',
    })

    expect(concept.id).toBe('concept-id')
    expect(concept.learningSpaceId).toBe('space-1')
    expect(concept.name).toBe('Cardiac output')
    expect(concept.materialIds).toEqual([])
    expect(concept.createdAt).toBeTypeOf('number')
    expect(concept.updatedAt).toBe(concept.createdAt)
    expect(repository.create).toHaveBeenCalledOnce()
  })

  it('keeps linked material ids on create', async () => {
    const concept = await createConcept({
      learningSpaceId: 'space-1',
      name: 'Preload',
      materialIds: ['m-1', 'm-2'],
    })

    expect(concept.materialIds).toEqual(['m-1', 'm-2'])
  })

  it('rejects an empty name', async () => {
    await expect(
      createConcept({ learningSpaceId: 'space-1', name: '   ' }),
    ).rejects.toThrow()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('updates only provided fields and bumps updatedAt', async () => {
    repository.findById.mockResolvedValue({
      id: 'concept-id',
      learningSpaceId: 'space-1',
      name: 'New',
      materialIds: ['m-1'],
      createdAt: 1,
      updatedAt: 1,
    } satisfies Concept)

    const updated = await updateConcept('concept-id', {
      name: 'New',
      materialIds: ['m-1'],
    })

    expect(repository.update).toHaveBeenCalledWith('concept-id', {
      name: 'New',
      materialIds: ['m-1'],
      updatedAt: expect.any(Number),
    })
    expect(updated.name).toBe('New')
  })

  it('throws when the updated concept disappears', async () => {
    repository.findById.mockResolvedValue(undefined)

    await expect(
      updateConcept('missing', { name: 'New' }),
    ).rejects.toThrow()
  })

  it('deletes by id', async () => {
    await deleteConcept('concept-id')

    expect(repository.delete).toHaveBeenCalledWith('concept-id')
  })
})
