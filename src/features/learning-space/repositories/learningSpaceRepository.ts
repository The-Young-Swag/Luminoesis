import { db } from '#/shared/lib/db/dexie'
import type { LearningSpace } from '#/shared/types/learningSpace'

export const learningSpaceRepository = {
  async findAll(): Promise<LearningSpace[]> {
    return db.learningSpaces.toArray()
  },

  async findById(id: string): Promise<LearningSpace | undefined> {
    return db.learningSpaces.get(id)
  },

  async create(learningSpace: LearningSpace): Promise<void> {
    await db.learningSpaces.add(learningSpace)
  },

  async update(
    id: string,
    patch: Partial<LearningSpace>,
  ): Promise<void> {
    await db.learningSpaces.update(id, patch)
  },

  async delete(id: string): Promise<void> {
    await db.learningSpaces.delete(id)
  },
}
