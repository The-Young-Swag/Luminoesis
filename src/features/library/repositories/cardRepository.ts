import { db } from '#/shared/lib/db/dexie'
import type { Card } from '#/features/library/domain/card'

function matchesQuery(card: Card, query: string): boolean {
  const q = query.trim().toLowerCase()

  if (!q) {
    return true
  }

  return (
    card.front.toLowerCase().includes(q) ||
    card.back.toLowerCase().includes(q) ||
    card.topic.toLowerCase().includes(q)
  )
}

export const cardRepository = {
  async findAll(): Promise<Card[]> {
    return db.cards.toArray()
  },

  async findPage({
    offset,
    limit,
    query = '',
  }: {
    offset: number
    limit: number
    query?: string
  }): Promise<Card[]> {
    let collection = db.cards.orderBy('id')

    if (query.trim()) {
      collection = collection.filter((card) => matchesQuery(card, query))
    }

    return collection.offset(offset).limit(limit).toArray()
  },

  async count(query = ''): Promise<number> {
    if (!query.trim()) {
      return db.cards.count()
    }

    return db.cards.filter((card) => matchesQuery(card, query)).count()
  },

  async findById(id: string): Promise<Card | undefined> {
    return db.cards.get(id)
  },

  async create(card: Card): Promise<void> {
    await db.cards.add(card)
  },

  async createMany(cards: Card[]): Promise<void> {
    await db.cards.bulkAdd(cards)
  },

  async update(
    id: string,
    patch: Partial<Card>,
  ): Promise<void> {
    await db.cards.update(id, patch)
  },

  async delete(id: string): Promise<void> {
    await db.cards.delete(id)
  },

  async clear(): Promise<void> {
    await db.cards.clear()
  },
}