import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { QuizAttempt } from '#/features/quiz/domain/quizAttempt'
import { quizAttemptRepository } from '#/features/quiz/repositories/quizAttemptRepository'

export function useQuizAttempts(learningSpaceId: string): {
  attempts: QuizAttempt[]
  loading: boolean
} {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const subscription = liveQuery(() =>
      quizAttemptRepository.getByLearningSpace(learningSpaceId),
    ).subscribe({
      next: (next) => {
        if (cancelled) return
        setAttempts(next)
        setLoading(false)
      },
      error: (error) => {
        if (cancelled) return
        console.error('Failed to observe quiz attempts:', error)
        setLoading(false)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [learningSpaceId])

  return { attempts, loading }
}
