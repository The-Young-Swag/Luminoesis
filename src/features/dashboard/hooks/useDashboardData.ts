import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Card, ReviewSession, SessionSignal } from '#/shared/types/domain'

import { seedIfEmpty } from '#/shared/lib/db/seed'
import { cardRepository } from '#/shared/repositories/cardRepository'
import { sessionRepository } from '#/shared/repositories/sessionRepository'
import { signalRepository } from '#/shared/repositories/signalRepository'
import { settingsRepository } from '#/shared/repositories/settingsRepository'

const RECENT_SIGNAL_LIMIT = 100

type DashboardData = {
  cards: Card[]
  sessions: ReviewSession[]
  signals: SessionSignal[]
  optIn: boolean | null
}

const EMPTY_DATA: DashboardData = {
  cards: [],
  sessions: [],
  signals: [],
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
    ready,
    optIn: data.optIn,
    setOptIn,
  }
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [cards, sessions, signals, optIn] = await Promise.all([
    cardRepository.findAll(),
    sessionRepository.findAll(),
    signalRepository.findRecent(RECENT_SIGNAL_LIMIT),
    settingsRepository.getAdaptiveOptIn(),
  ])

  return { cards, sessions, signals, optIn }
}