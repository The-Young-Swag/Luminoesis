import Dexie from 'dexie'
import type { Table } from 'dexie'

import type {
  AppSettings,
  BaselineFeature,
  Card,
  Insight,
  ReviewSession,
  SessionSignal,
} from '#/shared/types/settings'

import type { LearningSpace } from '#/features/learning-space/domain/learningSpace'

// ---------------------------------------------------------------------------
// Dexie DB
// ---------------------------------------------------------------------------

export class CircadiaDB extends Dexie {
  cards!: Table<Card, string>
  reviewSessions!: Table<ReviewSession, string>
  baselineFeatures!: Table<BaselineFeature, string>
  sessionSignals!: Table<SessionSignal, string>
  insights!: Table<Insight, string>
  appSettings!: Table<AppSettings, string>
  learningSpaces!: Table<LearningSpace, string>

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

    // Additive only — version 1's stores are untouched. Dexie carries
    // unchanged tables forward automatically; only the new store needs
    // restating here.
    this.version(2).stores({
      learningSpaces: 'id, createdAt, updatedAt',
    })
  }
}

export const db = new CircadiaDB()
