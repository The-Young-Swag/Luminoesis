import { db } from '#/shared/lib/db/dexie'
import type { Highlight } from '#/features/learning-space/domain/learningSpace'

export const highlightRepository = {
  async findById(id: string): Promise<Highlight | undefined> {
    return db.highlights.get(id)
  },

  async findByMaterialId(materialId: string): Promise<Highlight[]> {
    return db.highlights
      .where('materialId')
      .equals(materialId)
      .toArray()
  },

  async findByConceptId(conceptId: string): Promise<Highlight[]> {
    return db.highlights
      .where('conceptId')
      .equals(conceptId)
      .toArray()
  },

  async create(highlight: Highlight): Promise<void> {
    await db.highlights.add(highlight)
  },

  async delete(id: string): Promise<void> {
    await db.highlights.delete(id)
  },
}
