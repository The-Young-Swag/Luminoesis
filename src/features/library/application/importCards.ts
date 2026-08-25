import type { Card } from '#/features/library/domain/card'
import type { RawCard } from '#/features/library/domain/import'

import { cardRepository } from '#/features/library/repositories/cardRepository'

export async function importCards(
    rawCards: RawCard[],
): Promise<Card[]> {
    const validCards = rawCards.filter(
    (card) => card.front.trim() && card.back.trim(),
    )

    if (validCards.length === 0) {
    return []
    }

    const now = new Date().toISOString()
    const today = now.slice(0, 10)

    const cards: Card[] = validCards.map((card) => ({
    id: crypto.randomUUID().slice(0, 8),
    front: card.front.trim(),
    back: card.back.trim(),
    topic: card.topic.trim() || 'General',
    createdAt: now,
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: today,
    }))

    await cardRepository.createMany(cards)

    return cards
}