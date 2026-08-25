import { z } from 'zod'

import { learningSpaceRepository } from '#/features/learning-space/repositories/learningSpaceRepository'
import { createLearningSpaceId } from '#/features/learning-space/domain/ids'
import type { LearningSpace } from '#/features/learning-space/domain/learningSpace'

const CreateLearningSpaceSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
})

export type CreateLearningSpaceInput = z.input<
  typeof CreateLearningSpaceSchema
>

export async function createLearningSpace(
  input: CreateLearningSpaceInput,
): Promise<LearningSpace> {
  const data = CreateLearningSpaceSchema.parse(input)
  const now = Date.now()

  const learningSpace: LearningSpace = {
    id: createLearningSpaceId(),
    title: data.title,
    description: data.description,
    createdAt: now,
    updatedAt: now,
  }

  await learningSpaceRepository.create(learningSpace)

  return learningSpace
}
