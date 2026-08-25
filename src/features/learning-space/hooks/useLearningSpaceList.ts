import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { LearningSpace } from '#/features/learning-space/domain/learningSpace'
import { learningSpaceRepository } from '#/features/learning-space/repositories/learningSpaceRepository'

export function useLearningSpaceList() {
  const [learningSpaces, setLearningSpaces] = useState<LearningSpace[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const subscription = liveQuery(() =>
      learningSpaceRepository.findAll(),
    ).subscribe({
      next: (nextLearningSpaces) => {
        if (cancelled) {
          return
        }

        setLearningSpaces(nextLearningSpaces)
        setReady(true)
      },

      error: (error) => {
        if (cancelled) {
          return
        }

        console.error(
          'Failed to observe learning spaces:',
          error,
        )

        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { learningSpaces, ready }
}
