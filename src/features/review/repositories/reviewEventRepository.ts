import { db } from '#/shared/lib/db/dexie'
import type { ReviewEvent } from '#/features/review/domain/reviewEvent'

export const reviewEventRepository = {
  async findAll(): Promise<ReviewEvent[]> {
    return db.reviewEvents.toArray()
  },

  async findById(id: string): Promise<ReviewEvent | undefined> {
    return db.reviewEvents.get(id)
  },

  async findByConceptId(
    conceptId: string,
  ): Promise<ReviewEvent[]> {
    return db.reviewEvents
      .where('conceptId')
      .equals(conceptId)
      .toArray()
  },

  async findByObjectType(
    objectType: ReviewEvent['objectType'],
  ): Promise<ReviewEvent[]> {
    return db.reviewEvents
      .where('objectType')
      .equals(objectType)
      .toArray()
  },

  async create(event: ReviewEvent): Promise<void> {
    await db.reviewEvents.add(event)
  },

  async deleteByObject(
    objectType: ReviewEvent['objectType'],
    objectId: string,
  ): Promise<void> {
    const matches = await db.reviewEvents
      .where('objectId')
      .equals(objectId)
      .filter((event) => event.objectType === objectType)
      .toArray()

    if (matches.length > 0) {
      await db.reviewEvents.bulkDelete(matches.map((event) => event.id))
    }
  },

  async clear(): Promise<void> {
    await db.reviewEvents.clear()
  },
}
