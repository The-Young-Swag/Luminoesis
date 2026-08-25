import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { LearningSpace } from '#/shared/types/learningSpace'
import { learningSpaceRepository } from '#/shared/repositories/learningSpaceRepository'

export function useLearningSpaceDetail(id: string) {
  const [learningSpace, setLearningSpace] = useState<
    LearningSpace | undefined
  >(undefined)

  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const subscription = liveQuery(() =>
      learningSpaceRepository.findById(id),
    ).subscribe({
      next: (next) => {
        if (cancelled) {
          return
        }

        setLearningSpace(next)
        setReady(true)
      },

      error: (error) => {
        if (cancelled) {
          return
        }

        console.error(
          'Failed to observe learning space:',
          error,
        )

        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [id])

  return { learningSpace, ready }
}
