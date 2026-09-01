import { db } from '#/shared/lib/db/dexie'
import type { MaterialFileRecord } from '#/features/learning-space/domain/materialFile'

export const materialFileRepository = {
  async findByMaterialId(materialId: string): Promise<MaterialFileRecord | undefined> {
    return db.materialFiles.get(materialId)
  },

  async save(record: MaterialFileRecord): Promise<void> {
    await db.materialFiles.put(record)
  },

  async deleteByMaterialId(materialId: string): Promise<void> {
    await db.materialFiles.delete(materialId)
  },
}