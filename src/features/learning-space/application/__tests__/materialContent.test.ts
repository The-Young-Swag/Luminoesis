import { describe, expect, it, vi, beforeEach } from 'vitest'

import { saveMaterialContent } from '#/features/learning-space/application/saveMaterialContent'

const { repository } = vi.hoisted(() => ({
  repository: {
    upsert: vi.fn(),
    findByMaterialId: vi.fn(),
    deleteByMaterialId: vi.fn(),
  },
}))

vi.mock(
  '#/features/learning-space/repositories/materialContentRepository',
  () => ({
    materialContentRepository: repository,
  }),
)

describe('saveMaterialContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists user-provided content with a fresh timestamp', async () => {
    const content = await saveMaterialContent({
      materialId: 'm-1',
      source: 'user',
      blocks: [
        { id: 'b-1', type: 'heading', text: 'Introduction' },
        { id: 'b-2', type: 'paragraph', text: 'Some text.' },
      ],
    })

    expect(content.materialId).toBe('m-1')
    expect(content.source).toBe('user')
    expect(content.blocks).toHaveLength(2)
    expect(content.updatedAt).toBeTypeOf('number')
    expect(repository.upsert).toHaveBeenCalledOnce()
  })

  it('accepts extracted content for the same canonical shape', async () => {
    const content = await saveMaterialContent({
      materialId: 'm-2',
      source: 'extracted',
      blocks: [{ id: 'b-1', type: 'paragraph', text: 'Parsed body.' }],
    })

    expect(content.source).toBe('extracted')
  })

  it('rejects an empty materialId', async () => {
    await expect(
      saveMaterialContent({
        materialId: '   ',
        source: 'user',
        blocks: [],
      }),
    ).rejects.toThrow()
    expect(repository.upsert).not.toHaveBeenCalled()
  })

  it('rejects unknown block types', async () => {
    await expect(
      saveMaterialContent({
        materialId: 'm-1',
        source: 'user',
        // @ts-expect-error - invalid type on purpose
        blocks: [{ id: 'b-1', type: 'quote', text: 'x' }],
      }),
    ).rejects.toThrow()
  })
})
