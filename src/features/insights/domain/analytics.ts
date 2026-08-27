import type { Card } from '#/features/library/domain/card'
import type { Concept } from '#/features/learning-space/domain/learningSpace'
import type { ReviewEvent } from '#/features/review/domain/reviewEvent'
import type { ReviewSession } from '#/features/review/domain/reviewSession'

export type RetentionByTopic = {
  topic: string
  total: number
  correct: number
  rate: number
}

export type RetentionPeriodComparison = {
  current: number | null
  previous: number | null
  delta: number | null
  currentReviews: number
  previousReviews: number
}

export type SessionSummary = {
  sessionId: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  reviewCount: number
  recallRate: number
  averageGrade: number
}

export type SessionLengthPerf = {
  sessionId: string
  durationMinutes: number
  reviewCount: number
  recallRate: number
  averageGrade: number
  startedAt: string
}

export type ActionablePattern = {
  text: string
  stat: string
  action: string
} | null

function isSuccessfulRecallGrade(
  grade: number,
): boolean {
  return grade >= 2
}

function isSuccessfulRecall(
  session: ReviewSession,
): boolean {
  return isSuccessfulRecallGrade(session.grade)
}

/**
 * Concept-level retention derived from the canonical ReviewEvent bridge.
 *
 * Every study path (flashcards, quizzes, brain-trainer, and the legacy
 * /review page via submitReview) records a ReviewEvent keyed by conceptId,
 * so this is the single source of truth for mastery — replacing the older
 * card/topic-based retention that only saw library-card reviews.
 */
export function retentionByConcept(
  events: ReviewEvent[],
  concepts: Concept[],
): RetentionByTopic[] {
  const nameById = new Map(
    concepts.map((concept) => [concept.id, concept.name]),
  )

  const groups = new Map<
    string,
    {
      name: string
      total: number
      correct: number
    }
  >()

  for (const event of events) {
    const group =
      groups.get(event.conceptId) ?? {
        name: nameById.get(event.conceptId) ?? 'General',
        total: 0,
        correct: 0,
      }

    group.total += 1

    if (isSuccessfulRecallGrade(event.grade)) {
      group.correct += 1
    }

    groups.set(event.conceptId, group)
  }

  return [...groups.entries()]
    .map(([, group]) => ({
      topic: group.name,
      total: group.total,
      correct: group.correct,
      rate:
        group.total > 0
          ? group.correct / group.total
          : 0,
    }))
    .sort((a, b) => b.total - a.total || b.rate - a.rate)
}

function eventRetentionRate(
  events: ReviewEvent[],
): number | null {
  if (events.length === 0) {
    return null
  }

  const successful = events.filter((event) =>
    isSuccessfulRecallGrade(event.grade),
  ).length

  return successful / events.length
}

/**
 * Period-over-period recall comparison sourced from ReviewEvents (concept
 * bridge) rather than the legacy per-session table.
 */
export function retentionPeriodComparisonEvents(
  events: ReviewEvent[],
  periodDays = 7,
  now = new Date(),
): RetentionPeriodComparison {
  const periodMs =
    periodDays *
    24 *
    60 *
    60 *
    1000

  const nowMs = now.getTime()
  const currentStart = nowMs - periodMs
  const previousStart = currentStart - periodMs

  const currentEvents = events.filter(
    (event) =>
      event.timestamp >= currentStart &&
      event.timestamp <= nowMs,
  )

  const previousEvents = events.filter(
    (event) =>
      event.timestamp >= previousStart &&
      event.timestamp < currentStart,
  )

  const current = eventRetentionRate(currentEvents)
  const previous = eventRetentionRate(previousEvents)

  return {
    current,
    previous,
    delta:
      current !== null && previous !== null
        ? current - previous
        : null,
    currentReviews: currentEvents.length,
    previousReviews: previousEvents.length,
  }
}

export function retentionByTopic(
  cards: Card[],
  sessions: ReviewSession[],
): RetentionByTopic[] {
  const topicByCardId = new Map(
    cards.map((card) => [
      card.id,
      card.topic,
    ]),
  )

  const groups = new Map<
    string,
    {
      total: number
      correct: number
    }
  >()

  for (const session of sessions) {
    const topic =
      topicByCardId.get(session.cardId) ??
      'General'

    const group =
      groups.get(topic) ?? {
        total: 0,
        correct: 0,
      }

    group.total += 1

    if (isSuccessfulRecall(session)) {
      group.correct += 1
    }

    groups.set(topic, group)
  }

  return [...groups.entries()]
    .map(([topic, group]) => ({
      topic,
      total: group.total,
      correct: group.correct,
      rate:
        group.total > 0
          ? group.correct / group.total
          : 0,
    }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.rate - a.rate,
    )
}

function retentionRate(
  sessions: ReviewSession[],
): number | null {
  if (sessions.length === 0) {
    return null
  }

  const successful =
    sessions.filter(
      isSuccessfulRecall,
    ).length

  return successful / sessions.length
}

export function retentionPeriodComparison(
  sessions: ReviewSession[],
  periodDays = 7,
  now = new Date(),
): RetentionPeriodComparison {
  const periodMs =
    periodDays *
    24 *
    60 *
    60 *
    1000

  const nowMs = now.getTime()
  const currentStart =
    nowMs - periodMs
  const previousStart =
    currentStart - periodMs

  const currentSessions =
    sessions.filter((session) => {
      const timestamp =
        new Date(
          session.timestamp,
        ).getTime()

      return (
        timestamp >= currentStart &&
        timestamp <= nowMs
      )
    })

  const previousSessions =
    sessions.filter((session) => {
      const timestamp =
        new Date(
          session.timestamp,
        ).getTime()

      return (
        timestamp >= previousStart &&
        timestamp < currentStart
      )
    })

  const current =
    retentionRate(currentSessions)

  const previous =
    retentionRate(previousSessions)

  return {
    current,
    previous,
    delta:
      current !== null &&
      previous !== null
        ? current - previous
        : null,
    currentReviews:
      currentSessions.length,
    previousReviews:
      previousSessions.length,
  }
}

export function sessionSummaries(
  reviews: ReviewSession[],
): SessionSummary[] {
  const grouped =
    new Map<string, ReviewSession[]>()

  for (const review of reviews) {
    const group =
      grouped.get(review.sessionId) ?? []

    group.push(review)

    grouped.set(
      review.sessionId,
      group,
    )
  }

  return [...grouped.entries()]
    .flatMap(
      ([sessionId, sessionReviews]) => {
        const sorted = [
          ...sessionReviews,
        ].sort(
          (a, b) =>
            new Date(
              a.timestamp,
            ).getTime() -
            new Date(
              b.timestamp,
            ).getTime(),
        )

        const first = sorted.at(0)
        const last = sorted.at(-1)

        if (!first || !last) {
          return []
        }

        const persistedDuration =
          Math.max(
            ...sorted.map(
              (review) =>
                review.durationMs ?? 0,
            ),
          )

        const timestampDuration =
          new Date(
            last.timestamp,
          ).getTime() -
          new Date(
            first.timestamp,
          ).getTime()

        const durationMs =
          persistedDuration > 0
            ? persistedDuration
            : Math.max(
                0,
                timestampDuration,
              )

        const successful =
          sorted.filter(
            isSuccessfulRecall,
          ).length

        return [
          {
            sessionId,
            startedAt: first.timestamp,
            endedAt: last.timestamp,
            durationMinutes:
              durationMs / 60000,
            reviewCount: sorted.length,
            recallRate:
              successful / sorted.length,
            averageGrade:
              sorted.reduce(
                (sum, review) =>
                  sum + review.grade,
                0,
              ) / sorted.length,
          },
        ]
      },
    )
    .sort(
      (a, b) =>
        new Date(
          b.startedAt,
        ).getTime() -
        new Date(
          a.startedAt,
        ).getTime(),
    )
}

export function sessionLengthVsPerf(
  sessions: ReviewSession[],
): SessionLengthPerf[] {
  return sessionSummaries(sessions).map(
    (session) => ({
      sessionId: session.sessionId,
      durationMinutes:
        session.durationMinutes,
      reviewCount: session.reviewCount,
      recallRate: session.recallRate,
      averageGrade:
        session.averageGrade,
      startedAt: session.startedAt,
    }),
  )
}

export function actionablePattern(
  sessions: ReviewSession[],
  cards: Card[],
): ActionablePattern {
  if (sessions.length < 10) {
    return null
  }

  const topics = retentionByTopic(
    cards,
    sessions,
  ).filter(
    (topic) => topic.total >= 5,
  )

  if (topics.length < 2) {
    return null
  }

  const strongest = topics.reduce(
    (best, topic) =>
      topic.rate > best.rate
        ? topic
        : best,
  )

  const weakest = topics.reduce(
    (worst, topic) =>
      topic.rate < worst.rate
        ? topic
        : worst,
  )

  const difference =
    strongest.rate - weakest.rate

  if (difference < 0.15) {
    return null
  }

  return {
    text:
      `Your recall is currently strongest in ${strongest.topic}.`,
    stat:
      `${Math.round(
        strongest.rate * 100,
      )}% recall there versus ` +
      `${Math.round(
        weakest.rate * 100,
      )}% in ${weakest.topic}.`,
    action:
      `A short ${weakest.topic} review could help strengthen that gap.`,
  }
}