import { describe, expect, it, vi, beforeEach } from 'vitest'

import { createHighlight } from '#/features/learning-space/application/createHighlight'

const { repository } = vi.hoisted(() => ({
  repository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByMaterialId: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock(
  '#/features/learning-space/repositories/highlightRepository',
  () => ({
    highlightRepository: repository,
  }),
)

describe('createHighlight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists a highlight with provenance and timestamps', async () => {
    const highlight = await createHighlight({
      learningSpaceId: 'space-1',
      materialId: 'm-1',
      text: 'Chlorophyll absorbs red light.',
    })

    expect(highlight.id).toBeTypeOf('string')
    expect(highlight.learningSpaceId).toBe('space-1')
    expect(highlight.materialId).toBe('m-1')
    expect(highlight.text).toBe('Chlorophyll absorbs red light.')
    expect(highlight.createdAt).toBeTypeOf('number')
    expect(repository.create).toHaveBeenCalledOnce()
  })

  it('attaches a concept when provided', async () => {
    const highlight = await createHighlight({
      learningSpaceId: 'space-1',
      materialId: 'm-1',
      text: 'A selected passage.',
      conceptId: 'c-1',
    })

    expect(highlight.conceptId).toBe('c-1')
  })

  it('rejects an empty selection', async () => {
    await expect(
      createHighlight({
        learningSpaceId: 'space-1',
        materialId: 'm-1',
        text: '   ',
      }),
    ).rejects.toThrow()
    expect(repository.create).not.toHaveBeenCalled()
  })
})
