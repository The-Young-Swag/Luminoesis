import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import { conceptRepository } from '#/features/learning-space/repositories/conceptRepository'

export function useConcepts(learningSpaceId: string) {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const subscription = liveQuery(() =>
      conceptRepository.findByLearningSpaceId(learningSpaceId),
    ).subscribe({
      next: (next) => {
        if (cancelled) {
          return
        }

        setConcepts(next)
        setReady(true)
      },

      error: (error) => {
        if (cancelled) {
          return
        }

        console.error('Failed to observe concepts:', error)

        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [learningSpaceId])

  return { concepts, ready }
}
