import {
  useEffect,
  useState,
} from 'react'

import {
  actionablePattern,
  retentionByConcept,
  sessionLengthVsPerf,
} from '#/features/insights/domain/analytics'

import { cardRepository } from '#/features/library/repositories/cardRepository'
import { conceptRepository } from '#/features/learning-space/repositories/conceptRepository'
import { sessionRepository } from '#/features/review/repositories/sessionRepository'
import { reviewEventRepository } from '#/features/review/repositories/reviewEventRepository'

type InsightsData = {
  cards: Awaited<
    ReturnType<typeof cardRepository.findAll>
  >
  sessions: Awaited<
    ReturnType<typeof sessionRepository.findAll>
  >
  retention: ReturnType<typeof retentionByConcept>
  lengthPerf: ReturnType<typeof sessionLengthVsPerf>
  pattern: ReturnType<typeof actionablePattern>
}

export function useInsights() {
  const [data, setData] =
    useState<InsightsData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadInsights() {
      try {
        const [
          cards,
          sessions,
          concepts,
          reviewEvents,
        ] = await Promise.all([
          cardRepository.findAll(),
          sessionRepository.findAll(),
          conceptRepository.findAll(),
          reviewEventRepository.findAll(),
        ])

        const nextData: InsightsData = {
          cards,
          sessions,
          retention: retentionByConcept(
            reviewEvents,
            concepts,
          ),
          lengthPerf:
            sessionLengthVsPerf(sessions),
          pattern: actionablePattern(
            sessions,
            cards,
          ),
        }

        if (!cancelled) {
          setData(nextData)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Failed to load insights:',
            error,
          )
        }
      }
    }

    void loadInsights()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    data,
  }
}