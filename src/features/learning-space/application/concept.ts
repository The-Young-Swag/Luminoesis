import { z } from 'zod'

import {
  createConceptId,
} from '#/features/learning-space/domain/ids'
import type { Concept } from '#/features/learning-space/domain/learningSpace'
import { conceptRepository } from '#/features/learning-space/repositories/conceptRepository'

const CreateConceptSchema = z.object({
  learningSpaceId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  materialIds: z.array(z.string()).default([]),
})

export type CreateConceptInput = z.input<typeof CreateConceptSchema>

export async function createConcept(
  input: CreateConceptInput,
): Promise<Concept> {
  const data = CreateConceptSchema.parse(input)
  const now = Date.now()

  const concept: Concept = {
    id: createConceptId(),
    learningSpaceId: data.learningSpaceId,
    name: data.name,
    description: data.description,
    materialIds: data.materialIds,
    createdAt: now,
    updatedAt: now,
  }

  await conceptRepository.create(concept)

  return concept
}

const UpdateConceptSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  materialIds: z.array(z.string()).optional(),
})

export type UpdateConceptInput = z.input<typeof UpdateConceptSchema>

export async function updateConcept(
  id: string,
  input: UpdateConceptInput,
): Promise<Concept> {
  const data = UpdateConceptSchema.parse(input)
  const patch: Partial<Concept> = { ...data, updatedAt: Date.now() }

  await conceptRepository.update(id, patch)

  const updated = await conceptRepository.findById(id)

  if (!updated) {
    throw new Error('Concept not found after update.')
  }

  return updated
}

export async function deleteConcept(id: string): Promise<void> {
  await conceptRepository.delete(id)
}
