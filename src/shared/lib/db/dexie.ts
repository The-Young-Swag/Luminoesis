import Dexie from 'dexie'
import type { Table } from 'dexie'

import type { AppSettings } from '#/shared/types/settings'
import type { LearningSpaceRecord } from '#/shared/lib/db/models'
import type { Material, Concept, Highlight } from '#/features/learning-space/domain/learningSpace'
import type { MaterialContent } from '#/features/learning-space/domain/materialContent'
import type { BaselineFeature, SessionSignal } from '#/features/learning-state/domain/learningSignals'
import type { Card } from '#/features/library/domain/card'
import type { Insight } from '#/features/insights/domain/insight'
import type { ReviewSession } from '#/features/review/domain/reviewSession'
import type { Question } from '#/features/quiz/domain/question'
import type { QuizAttempt } from '#/features/quiz/domain/quizAttempt'
import type { ReviewEvent } from '#/features/review/domain/reviewEvent'
import type { Flashcard } from '#/features/flashcard/domain/flashcard'

export class CircadiaDB extends Dexie {
  cards!: Table<Card, string>
  reviewSessions!: Table<ReviewSession, string>
  baselineFeatures!: Table<BaselineFeature, string>
  sessionSignals!: Table<SessionSignal, string>
  insights!: Table<Insight, string>
  appSettings!: Table<AppSettings, string>
  learningSpaces!: Table<LearningSpaceRecord, string>
  materials!: Table<Material, string>
  concepts!: Table<Concept, string>
  flashcards!: Table<Flashcard, string>
  reviewEvents!: Table<ReviewEvent, string>
  questions!: Table<Question, string>
  quizAttempts!: Table<QuizAttempt, string>
  materialContents!: Table<MaterialContent, string>
  highlights!: Table<Highlight, string>

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

    this.version(4).stores({
      concepts: 'id, learningSpaceId, createdAt, updatedAt',
    })

    this.version(5).stores({
      flashcards: 'id, conceptId, materialId, dueDate, createdAt',
      reviewEvents: 'id, conceptId, objectType, objectId, timestamp',
    })

    this.version(6).stores({
      questions: 'id, conceptId, materialId, createdAt, updatedAt',
      quizAttempts: 'id, learningSpaceId, createdAt',
    })

    this.version(7).stores({
      materialContents: 'materialId, updatedAt',
    })

    this.version(8).stores({
      highlights: 'id, materialId, conceptId, learningSpaceId, createdAt',
    })
  }
}

export const db = new CircadiaDB()