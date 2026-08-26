import { z } from 'zod'

import { createMaterialId } from '#/features/learning-space/domain/ids'
import type { Material } from '#/features/learning-space/domain/learningSpace'
import { materialRepository } from '#/features/learning-space/repositories/materialRepository'

const CreateMaterialSchema = z.object({
  learningSpaceId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  type: z.enum([
    'pdf',
    'image',
    'pptx',
    'text',
    'markdown',
  ]),
  source: z.object({
    kind: z.literal('local-file'),
    fileName: z.string().trim().min(1),
    mimeType: z.string().trim().min(1),
    sizeBytes: z.number().nonnegative(),
  }),
})

export type CreateMaterialInput = z.input<
  typeof CreateMaterialSchema
>

export async function createMaterial(
  input: CreateMaterialInput,
): Promise<Material> {
  const data = CreateMaterialSchema.parse(input)
  const now = Date.now()

  const material: Material = {
    id: createMaterialId(),
    learningSpaceId: data.learningSpaceId,
    title: data.title,
    type: data.type,
    source: data.source,
    extractionStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  await materialRepository.create(material)

  return material
}