import { z } from 'zod'

import type { MaterialContent } from '#/features/learning-space/domain/materialContent'
import { materialContentRepository } from '#/features/learning-space/repositories/materialContentRepository'

const BlockSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['heading', 'paragraph', 'list-item']),
  text: z.string(),
})

const SaveMaterialContentSchema = z.object({
  materialId: z.string().trim().min(1),
  blocks: z.array(BlockSchema),
  source: z.enum(['user', 'extracted']),
})

export type SaveMaterialContentInput = z.input<
  typeof SaveMaterialContentSchema
>

/**
 * Persist the canonical readable content for a Material.
 *
 * Upserts by `materialId` so the same call works for both first-write and
 * later edits, and for user-provided content as well as future extracted
 * content. The `updatedAt` timestamp is always refreshed on write.
 */
export async function saveMaterialContent(
  input: SaveMaterialContentInput,
): Promise<MaterialContent> {
  const data = SaveMaterialContentSchema.parse(input)
  const now = Date.now()

  const content: MaterialContent = {
    materialId: data.materialId,
    blocks: data.blocks,
    source: data.source,
    updatedAt: now,
  }

  await materialContentRepository.upsert(content)

  return content
}
