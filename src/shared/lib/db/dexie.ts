import Dexie from 'dexie'
import type { Table } from 'dexie'

import type { AppSettings } from '#/shared/types/settings'
import type { LearningSpaceRecord } from '#/shared/lib/db/models'
import type { Material } from '#/features/learning-space/domain/learningSpace'
import type { BaselineFeature, SessionSignal } from '#/features/learning-state/domain/learningSignals'
import type { Card } from '#/features/library/domain/card'
import type { Insight } from '#/features/insights/domain/insight'
import type { ReviewSession } from '#/features/review/domain/reviewSession'

export class CircadiaDB extends Dexie {
  cards!: Table<Card, string>
  reviewSessions!: Table<ReviewSession, string>
  baselineFeatures!: Table<BaselineFeature, string>
  sessionSignals!: Table<SessionSignal, string>
  insights!: Table<Insight, string>
  appSettings!: Table<AppSettings, string>
  learningSpaces!: Table<LearningSpaceRecord, string>
  materials!: Table<Material, string>

  constructor() {
    super('circadia')

    this.version(1).stores({
      cards: 'id, topic, dueDate, targetDate, createdAt',
      reviewSessions: 'id, cardId, sessionId, timestamp',
      baselineFeatures: 'name',
      sessionSignals: 'id, sessionId, minuteIndex, timestamp',
      insights: 'id, timestamp, dismissed, kind',
      appSettings: 'key',
    })

    this.version(2).stores({
      learningSpaces: 'id, createdAt, updatedAt',
    })

    this.version(3).stores({
      materials: 'id, learningSpaceId, createdAt, updatedAt',
    })
  }
}

export const db = new CircadiaDB()