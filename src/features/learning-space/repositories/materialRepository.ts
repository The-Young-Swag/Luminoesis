import { db } from '#/shared/lib/db/dexie'
import type { Material } from '#/features/learning-space/domain/learningSpace'

export const materialRepository = {
  async findAll(): Promise<Material[]> {
    return db.materials.toArray()
  },

  async findById(id: string): Promise<Material | undefined> {
    return db.materials.get(id)
  },

  async findByLearningSpaceId(
    learningSpaceId: string,
  ): Promise<Material[]> {
    return db.materials
      .where('learningSpaceId')
      .equals(learningSpaceId)
      .toArray()
  },

  async create(material: Material): Promise<void> {
    await db.materials.add(material)
  },

  async update(
    id: string,
    patch: Partial<Material>,
  ): Promise<void> {
    await db.materials.update(id, patch)
  },

  async delete(id: string): Promise<void> {
    await db.materials.delete(id)
  },
}