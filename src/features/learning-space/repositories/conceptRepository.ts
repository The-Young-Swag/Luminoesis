import { db } from '#/shared/lib/db/dexie'
import type { Concept } from '#/features/learning-space/domain/learningSpace'

export const conceptRepository = {
  async findAll(): Promise<Concept[]> {
    return db.concepts.toArray()
  },

  async findById(id: string): Promise<Concept | undefined> {
    return db.concepts.get(id)
  },

  async findByLearningSpaceId(
    learningSpaceId: string,
  ): Promise<Concept[]> {
    return db.concepts
      .where('learningSpaceId')
      .equals(learningSpaceId)
      .toArray()
  },

  async findByMaterialId(materialId: string): Promise<Concept[]> {
    return db.concepts
      .filter((concept) => concept.materialIds.includes(materialId))
      .toArray()
  },

  async create(concept: Concept): Promise<void> {
    await db.concepts.add(concept)
  },

  async update(id: string, patch: Partial<Concept>): Promise<void> {
    await db.concepts.update(id, patch)
  },

  async delete(id: string): Promise<void> {
    await db.concepts.delete(id)
  },
}
