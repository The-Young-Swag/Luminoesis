import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import { reviewEventRepository } from '#/features/review/repositories/reviewEventRepository'
import { retentionByConcept } from '#/features/insights/domain/analytics'

export type ConceptMastery = {
  conceptId: string
  total: number
  correct: number
  rate: number
  label: 'Concept forming' | 'Uncertain' | 'Partial' | 'Mastered'
  dotClass: string
  showReview: boolean
}

function toMastery(total: number, rate: number): Omit<ConceptMastery, 'conceptId' | 'total' | 'correct' | 'rate'> {
  if (total === 0) {
    return {
      label: 'Concept forming',
      dotClass: 'bg-[#8891A8] shadow-[0_0_0_3px_rgba(137,145,168,0.14)]',
      showReview: false,
    }
  }
  if (total < 3 && rate < 0.6) {
    return {
      label: 'Uncertain',
      dotClass: 'bg-[#E1636B] shadow-[0_0_0_3px_rgba(225,99,107,0.13)]',
      showReview: true,
    }
  }
  if (rate < 0.5) {
    return {
      label: 'Uncertain',
      dotClass: 'bg-[#E1636B] shadow-[0_0_0_3px_rgba(225,99,107,0.13)]',
      showReview: true,
    }
  }
  if (rate < 0.82) {
    return {
      label: 'Partial',
      dotClass: 'bg-[#8891A8] shadow-[0_0_0_3px_rgba(137,145,168,0.14)]',
      showReview: false,
    }
  }
  return {
    label: 'Mastered',
    dotClass: 'bg-[#E8B54A] shadow-[0_0_0_3px_rgba(232,181,74,0.14)]',
    showReview: false,
  }
}

export function useConceptsMastery(concepts: Concept[]) {
  const [masteryById, setMasteryById] = useState<Map<string, ConceptMastery>>(new Map())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (concepts.length === 0) {
      setMasteryById(new Map())
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    const subscription = liveQuery(async () => {
      const allEvents = await reviewEventRepository.findAll()
      // Filter to only these concepts for retention calc
      const relevantConcepts = concepts
      const retention = retentionByConcept(allEvents, relevantConcepts)
      const map = new Map<string, ConceptMastery>()
      const byTopic = new Map(retention.map((item) => [item.topic, item]))

      for (const concept of concepts) {
        const stats = byTopic.get(concept.name)
        const total = stats?.total ?? 0
        const correct = stats?.correct ?? 0
        const rate = stats?.rate ?? 0
        const meta = toMastery(total, rate)
        map.set(concept.id, { conceptId: concept.id, total, correct, rate, ...meta })
      }

      // Concepts with no events remain Concept forming
      return map
    }).subscribe({
      next: (map) => {
        if (cancelled) return
        setMasteryById(map)
        setReady(true)
      },
      error: (error) => {
        if (cancelled) return
        console.error('Failed to observe concept mastery:', error)
        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [concepts])

  return { masteryById, ready }
}
