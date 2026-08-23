import type { Card } from '#/shared/types/domain'

import { cardRepository } from '#/shared/repositories/cardRepository'

export async function updateCard(
  id: string,
  patch: Partial<Card>,
): Promise<void> {
  await cardRepository.update(id, patch)
}