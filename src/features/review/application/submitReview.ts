import type { Card } from '#/features/library/domain/card'
import type { AggregatedFeatures } from '#/features/learning-state/domain/signals'

import { GradeSchema } from '#/features/review/schemas'

import { DEFAULT_ALPHA, updateEwma } from '#/features/learning-state/domain/baseline'
import { sm2 } from '#/features/review/domain/sm2'
import { baselineRepository } from '#/shared/repositories/baselineRepository'
import { cardRepository } from '#/features/library/repositories/cardRepository'
import { sessionRepository } from '#/shared/repositories/sessionRepository'

type SubmitReviewParams = {
  card: Card
  grade: number
  sessionId: string
  startedAt: number
  live: AggregatedFeatures | null
}

type SubmitReviewResult = {
  nextDueDate: string
}

export async function submitReview(
  params: SubmitReviewParams,
): Promise<SubmitReviewResult> {
  const grade = GradeSchema.parse(params.grade)
  const now = new Date()

  const result = sm2(
    {
      interval: params.card.interval,
      repetitions: params.card.repetitions,
      easeFactor: params.card.easeFactor,
    },
    grade,
    now,
  )

  await cardRepository.update(
    params.card.id,
    {
      interval: result.interval,
      repetitions: result.repetitions,
      easeFactor: result.easeFactor,
      dueDate: result.dueDate,
      lastReviewed: now.toISOString(),
    },
  )

  await sessionRepository.create({
    id: crypto.randomUUID().slice(0, 8),
    cardId: params.card.id,
    sessionId: params.sessionId,
    timestamp: now.toISOString(),
    grade,
    durationMs: Math.max(
      0,
      Date.now() - params.startedAt,
    ),
  })

  if (params.live) {
    await updateBaseline(params.live, now)
  }

  return {
    nextDueDate: result.dueDate,
  }
}

async function updateBaseline(
  live: AggregatedFeatures,
  now: Date,
): Promise<void> {
  const features: Array<[keyof AggregatedFeatures, number]> = [
    ['interKeyLatency', live.interKeyLatency],
    ['dwellTime', live.dwellTime],
    ['correctionRate', live.correctionRate],
    ['wpm', live.wpm],
  ]

  for (const [name, value] of features) {
    const row = await baselineRepository.getByName(name)

    if (!row) {
      continue
    }

    const next = updateEwma(
      {
        mean: row.mean,
        variance: row.variance,
        stddev: row.stddev,
        sampleCount: row.sampleCount,
      },
      value,
      DEFAULT_ALPHA,
    )

    await baselineRepository.upsert({
      name,
      mean: next.mean,
      variance: next.variance,
      stddev: next.stddev,
      sampleCount: next.sampleCount,
      lastUpdated: now.toISOString(),
    })
  }
}

