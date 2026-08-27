import { useMemo } from 'react'

import {
  actionablePattern,
  retentionByConcept,
  retentionPeriodComparisonEvents,
  sessionSummaries,
} from '#/features/insights/domain/analytics'
import { classifyLearningState } from '#/features/learning-state/domain/classifyState'
import { MIN_SAMPLES_FOR_BASELINE, peakWindow, zScore } from '#/features/learning-state/domain/baseline'

import type { BaselineMap } from '#/features/learning-state/domain/baseline'
import type { Concept } from '#/features/learning-space/domain/learningSpace'
import type { ReviewEvent } from '#/features/review/domain/reviewEvent'
import type { ReviewSession } from '#/features/review/domain/reviewSession'
import type { SessionSignal } from '#/features/learning-state/domain/learningSignals'
import type { Card } from '#/features/library/domain/card'

export type RecentActivityItem = {
  id: string
  label: string
  timestamp: string
  grade: number
}

export type RecentSignal = {
  id: string
  timestamp: string
  interKeyLatency: number
  dwellTime: number
  correctionRate: number
  wpm: number
}

export type RhythmChartPoint = {
  id: string
  label: string
  deviation: number
}

type DashboardAnalyticsInput = {
  cards: Card[]
  sessions: ReviewSession[]
  signals: SessionSignal[]
  baseline: BaselineMap
  hasBaseline: boolean
  concepts: Concept[]
  reviewEvents: ReviewEvent[]
}

const RECENT_SIGNAL_WINDOW = 12
const RECENT_ACTIVITY_LIMIT = 6
const TOP_TOPIC_LIMIT = 6
const RETENTION_COMPARISON_WINDOW_DAYS = 7
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const DEFAULT_CONCEPT_LABEL = 'Concept'

export function useDashboardAnalytics({
  cards,
  sessions,
  signals,
  baseline,
  hasBaseline,
  concepts,
  reviewEvents,
}: DashboardAnalyticsInput) {
  const recentSignals = useMemo<RecentSignal[]>(
    () =>
      [...signals]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-RECENT_SIGNAL_WINDOW)
        .map((signal) => ({
          id: signal.id,
          timestamp: signal.timestamp,
          interKeyLatency: signal.interKeyLatency,
          dwellTime: signal.dwellTime,
          correctionRate: signal.correctionRate,
          wpm: signal.wpm,
        })),
    [signals],
  )

  const peakLearningHour = useMemo(() => {
    if (!hasBaseline || signals.length === 0) return null

    const hourStats = new Map<number, number[]>()

    for (const signal of signals) {
      const hour = new Date(signal.timestamp).getHours()
      const values = hourStats.get(hour) ?? []

      values.push(computeDeviation(signal, baseline))
      hourStats.set(hour, values)
    }

    return peakWindow(hourStats)
  }, [signals, baseline, hasBaseline])

  const dueToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return cards.filter((card) => card.dueDate <= today)
  }, [cards])

  const newCards = useMemo(() => cards.filter((card) => card.repetitions === 0), [cards])

  const retention = useMemo(
    () => retentionByConcept(reviewEvents, concepts),
    [reviewEvents, concepts],
  )

  const pattern = useMemo(() => actionablePattern(sessions, cards), [sessions, cards])

  const sessionCount = useMemo(
    () => new Set(sessions.map((session) => session.sessionId)).size,
    [sessions],
  )

  const recentActivity = useMemo<RecentActivityItem[]>(() => {
    const nameById = new Map(
      concepts.map((concept) => [concept.id, concept.name]),
    )

    return [...reviewEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, RECENT_ACTIVITY_LIMIT)
      .map((event) => ({
        id: event.id,
        label: nameById.get(event.conceptId) ?? DEFAULT_CONCEPT_LABEL,
        timestamp: new Date(event.timestamp).toISOString(),
        grade: event.grade,
      }))
  }, [reviewEvents, concepts])

  const summaries = useMemo(() => sessionSummaries(sessions), [sessions])

  const retentionComparison = useMemo(
    () =>
      retentionPeriodComparisonEvents(
        reviewEvents,
        RETENTION_COMPARISON_WINDOW_DAYS,
      ),
    [reviewEvents],
  )

  const studyMinutesThisWeek = useMemo(() => {
    const weekAgo = Date.now() - RETENTION_COMPARISON_WINDOW_DAYS * MILLISECONDS_PER_DAY

    return Math.round(
      summaries
        .filter((session) => new Date(session.startedAt).getTime() >= weekAgo)
        .reduce((total, session) => total + session.durationMinutes, 0),
    )
  }, [summaries])

  const recentReviewCount = retentionComparison.currentReviews

  const learningState = classifyLearningState({ baseline, recent: recentSignals })

  const isCalibrating = !hasBaseline

  const retentionChartData = useMemo(
    () =>
      retention.slice(0, TOP_TOPIC_LIMIT).map((item) => ({
        topic: item.topic,
        rate: Math.round(item.rate * 100),
      })),
    [retention],
  )

  const rhythmChartData = useMemo<RhythmChartPoint[]>(() => {
    if (!hasBaseline) return []

    return recentSignals.map((signal) => ({
      id: signal.id,
      label: new Date(signal.timestamp).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }),
      deviation: computeDeviation(signal, baseline),
    }))
  }, [recentSignals, baseline, hasBaseline])

  const recallValue =
    retentionComparison.current === null
      ? '—'
      : `${Math.round(retentionComparison.current * 100)}%`

  const recallHint =
    retentionComparison.delta === null
      ? 'More history needed for delta'
      : `${formatSignedPoints(retentionComparison.delta)} vs previous 7 days`

  const calibrationProgress = useMemo(() => {
    const counts = Object.values(baseline).map((snapshot) => snapshot.sampleCount)
    if (counts.length === 0) return 0

    return Math.min(MIN_SAMPLES_FOR_BASELINE, Math.min(...counts))
  }, [baseline])

  return {
    recentSignals,
    rhythmChartData,
    peakLearningHour,
    dueToday,
    newCards,
    retention,
    pattern,
    sessionCount,
    recentActivity,
    summaries,
    retentionComparison,
    studyMinutesThisWeek,
    recentReviewCount,
    learningState,
    isCalibrating,
    retentionChartData,
    recallValue,
    recallHint,
    calibrationProgress,
  }
}

type DeviationSignal = Pick<
  SessionSignal,
  'interKeyLatency' | 'dwellTime' | 'correctionRate' | 'wpm'
>

/** Mean absolute z-score across all four timing signals vs. the personal baseline. */
function computeDeviation(signal: DeviationSignal, baseline: BaselineMap): number {
  const latency = Math.abs(zScore(signal.interKeyLatency, baseline.interKeyLatency))
  const dwell = Math.abs(zScore(signal.dwellTime, baseline.dwellTime))
  const correction = Math.abs(zScore(signal.correctionRate, baseline.correctionRate))
  const wpm = Math.abs(zScore(signal.wpm, baseline.wpm))

  return (latency + dwell + correction + wpm) / 4
}

function formatSignedPoints(delta: number): string {
  const points = Math.round(delta * 100)
  return `${points >= 0 ? '+' : ''}${points} pts`
}