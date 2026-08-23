import { cardRepository } from '#/shared/repositories/cardRepository'

export async function deleteCard(id: string): Promise<void> {
  await cardRepository.delete(id)
}