import { db } from '#/shared/lib/db/dexie'
import type {
  BaselineFeature,
  FeatureName,
} from '#/features/learning-state/domain/learningSignals'

export const baselineRepository = {
  async findAll(): Promise<BaselineFeature[]> {
    return db.baselineFeatures.toArray()
  },

  async getByName(
    name: FeatureName,
  ): Promise<BaselineFeature | undefined> {
    return db.baselineFeatures.get(name)
  },

  async upsert(
    feature: BaselineFeature,
  ): Promise<void> {
    await db.baselineFeatures.put(feature)
  },

  async clear(): Promise<void> {
    await db.baselineFeatures.clear()
  },
}