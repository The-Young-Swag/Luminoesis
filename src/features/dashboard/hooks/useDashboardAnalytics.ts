import { useMemo } from 'react'

import {
  actionablePattern,
  retentionByConcept,
  retentionPeriodComparisonEvents,
  sessionSummaries,
} from '#/features/insights/domain/analytics'
import { formatCountDelta } from '#/features/dashboard/domain/engagement-copy'
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
const HEATMAP_WEEKS = 12
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const DEFAULT_CONCEPT_LABEL = 'Concept'
const WEEKDAY_NAMES = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
]

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

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

  const studyMinutesDelta = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - RETENTION_COMPARISON_WINDOW_DAYS * MILLISECONDS_PER_DAY
    const twoWeeksAgo = now - 2 * RETENTION_COMPARISON_WINDOW_DAYS * MILLISECONDS_PER_DAY

    const previous = Math.round(
      summaries
        .filter((session) => {
          const started = new Date(session.startedAt).getTime()
          return started >= twoWeeksAgo && started < weekAgo
        })
        .reduce((total, session) => total + session.durationMinutes, 0),
    )

    if (studyMinutesThisWeek === 0 && previous === 0) return null
    return formatCountDelta(studyMinutesThisWeek, previous)
  }, [summaries, studyMinutesThisWeek])

  const recentReviewCount = retentionComparison.currentReviews

  const recentReviewDelta =
    retentionComparison.currentReviews === 0 &&
    retentionComparison.previousReviews === 0
      ? null
      : formatCountDelta(
          retentionComparison.currentReviews,
          retentionComparison.previousReviews,
        )

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

  const recallDelta =
    retentionComparison.delta === null
      ? null
      : `${formatSignedPoints(retentionComparison.delta)} vs last week`

  const weekMinutes = useMemo(() => {
    const today = startOfDay(Date.now())
    const minutes = [0, 0, 0, 0, 0, 0, 0]

    for (const session of summaries) {
      const diff = Math.round(
        (today - startOfDay(new Date(session.startedAt).getTime())) /
          MILLISECONDS_PER_DAY,
      )
      if (diff >= 0 && diff < 7) {
        minutes[6 - diff] += session.durationMinutes
      }
    }

    return minutes.map((value) => Math.round(value))
  }, [summaries])

  const weekActivity = useMemo(() => {
    const today = startOfDay(Date.now())
    const counts = [0, 0, 0, 0, 0, 0, 0]

    for (const event of reviewEvents) {
      const diff = Math.round((today - startOfDay(event.timestamp)) / MILLISECONDS_PER_DAY)
      if (diff >= 0 && diff < 7) {
        counts[6 - diff] += 1
      }
    }

    return counts
  }, [reviewEvents])

  const heatmap = useMemo(() => {
    const today = startOfDay(Date.now())
    const totalDays = HEATMAP_WEEKS * 7
    const start = today - (totalDays - 1) * MILLISECONDS_PER_DAY
    const days = new Array<number>(totalDays).fill(0)

    for (const event of reviewEvents) {
      const index = Math.round((startOfDay(event.timestamp) - start) / MILLISECONDS_PER_DAY)
      if (index >= 0 && index < totalDays) {
        days[index] += 1
      }
    }

    const weeks: number[][] = []
    for (let week = 0; week < HEATMAP_WEEKS; week++) {
      weeks.push(days.slice(week * 7, week * 7 + 7))
    }

    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]
    days.forEach((count, index) => {
      weekdayTotals[new Date(start + index * MILLISECONDS_PER_DAY).getDay()] += count
    })
    const bestDay = weekdayTotals.indexOf(Math.max(...weekdayTotals))
    const total = days.reduce((sum, count) => sum + count, 0)

    return { weeks, total, bestDay: WEEKDAY_NAMES[bestDay], startDate: start }
  }, [reviewEvents])

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
    studyMinutesDelta,
    recentReviewCount,
    recentReviewDelta,
    learningState,
    isCalibrating,
    retentionChartData,
    recallValue,
    recallDelta,
    weekActivity,
    weekMinutes,
    heatmap,
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
  return `${points >= 0 ? '+' : ''}${points} points`
}