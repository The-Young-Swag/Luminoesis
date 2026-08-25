import { z } from 'zod'

import { cardRepository } from '#/features/library/repositories/cardRepository'

const UpdateCardSchema = z.object({
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
  topic: z.string().trim().default('General'),
  targetDate: z.string().optional(),
})

export type UpdateCardInput = z.input<typeof UpdateCardSchema>

export async function updateCard(
  id: string,
  input: UpdateCardInput,
): Promise<void> {
  const data = UpdateCardSchema.parse(input)

  await cardRepository.update(id, {
    front: data.front,
    back: data.back,
    topic: data.topic || 'General',
    targetDate: data.targetDate || undefined,
  })
}