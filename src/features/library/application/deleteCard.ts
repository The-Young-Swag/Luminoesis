import { cardRepository } from '#/features/library/repositories/cardRepository'

export async function deleteCard(id: string): Promise<void> {
  await cardRepository.delete(id)
}