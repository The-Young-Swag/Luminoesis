import { db } from '#/shared/lib/db/dexie'
import type { Flashcard } from '#/features/flashcard/domain/flashcard'

export const flashcardRepository = {
  async findAll(): Promise<Flashcard[]> {
    return db.flashcards.toArray()
  },

  async findById(id: string): Promise<Flashcard | undefined> {
    return db.flashcards.get(id)
  },

  async findByConceptId(
    conceptId: string,
  ): Promise<Flashcard[]> {
    return db.flashcards
      .where('conceptId')
      .equals(conceptId)
      .toArray()
  },

  async findByConceptIds(
    conceptIds: string[],
  ): Promise<Flashcard[]> {
    if (conceptIds.length === 0) {
      return []
    }

    return db.flashcards
      .where('conceptId')
      .anyOf(conceptIds)
      .toArray()
  },

  async findByMaterialId(
    materialId: string,
  ): Promise<Flashcard[]> {
    return db.flashcards
      .where('materialId')
      .equals(materialId)
      .toArray()
  },

  async create(flashcard: Flashcard): Promise<void> {
    await db.flashcards.add(flashcard)
  },

  async update(
    id: string,
    patch: Partial<Flashcard>,
  ): Promise<void> {
    await db.flashcards.update(id, patch)
  },

  async delete(id: string): Promise<void> {
    await db.flashcards.delete(id)
  },
}
