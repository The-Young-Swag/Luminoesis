import { z } from 'zod'

import { cardRepository } from '#/features/library/repositories/cardRepository'
import type { Card } from '#/features/library/domain/card'

const CreateCardSchema = z.object({
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
  topic: z.string().trim().default('General'),
  targetDate: z.string().optional(),
})

export type CreateCardInput = z.input<typeof CreateCardSchema>

export async function createCard(
  input: CreateCardInput,
): Promise<Card> {
  const data = CreateCardSchema.parse(input)
  const now = new Date().toISOString()

  const card: Card = {
    id: crypto.randomUUID().slice(0, 8),
    front: data.front,
    back: data.back,
    topic: data.topic || 'General',
    targetDate: data.targetDate,
    createdAt: now,
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: now.slice(0, 10),
  }

  await cardRepository.create(card)

  return card
}
