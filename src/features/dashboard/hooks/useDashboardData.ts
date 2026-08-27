import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import type { ReviewEvent } from '#/features/review/domain/reviewEvent'
import type { ReviewSession } from '#/features/review/domain/reviewSession'
import type { SessionSignal } from '#/features/learning-state/domain/learningSignals'
import type { Card } from '#/features/library/domain/card'

import { seedIfEmpty } from '#/shared/lib/db/seed'
import { conceptRepository } from '#/features/learning-space/repositories/conceptRepository'
import { cardRepository } from '#/features/library/repositories/cardRepository'
import { sessionRepository } from '#/features/review/repositories/sessionRepository'
import { signalRepository } from '#/features/review/repositories/signalRepository'
import { reviewEventRepository } from '#/features/review/repositories/reviewEventRepository'
import { settingsRepository } from '#/shared/repositories/settingsRepository'

const RECENT_SIGNAL_LIMIT = 100

type DashboardData = {
  cards: Card[]
  sessions: ReviewSession[]
  signals: SessionSignal[]
  concepts: Concept[]
  reviewEvents: ReviewEvent[]
  optIn: boolean | null
}

const EMPTY_DATA: DashboardData = {
  cards: [],
  sessions: [],
  signals: [],
  concepts: [],
  reviewEvents: [],
  optIn: null,
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    async function initialize() {
      try {
        await seedIfEmpty()
        if (cancelled) return

        const subscription = liveQuery(fetchDashboardData).subscribe({
          next: (nextData) => {
            if (cancelled) return
            setData(nextData)
            setReady(true)
          },
          error: (error) => {
            if (cancelled) return
            console.error('Failed to observe dashboard data:', error)
            setReady(true)
          },
        })

        unsubscribe = () => subscription.unsubscribe()
      } catch (error) {
        if (cancelled) return
        console.error('Failed to initialize dashboard data:', error)
        setReady(true)
      }
    }

    void initialize()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const setOptIn = async (value: boolean) => {
    await settingsRepository.setAdaptiveOptIn(value)
  }

  return {
    cards: data.cards,
    sessions: data.sessions,
    signals: data.signals,
    concepts: data.concepts,
    reviewEvents: data.reviewEvents,
    ready,
    optIn: data.optIn,
    setOptIn,
  }
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [
    cards,
    sessions,
    signals,
    concepts,
    reviewEvents,
    optIn,
  ] = await Promise.all([
    cardRepository.findAll(),
    sessionRepository.findAll(),
    signalRepository.findRecent(RECENT_SIGNAL_LIMIT),
    conceptRepository.findAll(),
    reviewEventRepository.findAll(),
    settingsRepository.getAdaptiveOptIn(),
  ])

  return {
    cards,
    sessions,
    signals,
    concepts,
    reviewEvents,
    optIn,
  }
}