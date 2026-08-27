import { db } from '#/shared/lib/db/dexie'
import type { MaterialContent } from '#/features/learning-space/domain/materialContent'

export const materialContentRepository = {
  async findByMaterialId(
    materialId: string,
  ): Promise<MaterialContent | undefined> {
    return db.materialContents.get(materialId)
  },

  async upsert(content: MaterialContent): Promise<void> {
    await db.materialContents.put(content)
  },

  async deleteByMaterialId(materialId: string): Promise<void> {
    await db.materialContents.delete(materialId)
  },
}
