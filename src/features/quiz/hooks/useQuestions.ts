import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Question } from '#/features/quiz/domain/question'
import { questionRepository } from '#/features/quiz/repositories/questionRepository'

export function useQuestions(conceptIds: string[]): {
  questions: Question[]
  loading: boolean
} {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const key = conceptIds.join(',')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const subscription = liveQuery(() =>
      questionRepository.getByConceptIds(conceptIds),
    ).subscribe({
      next: (next) => {
        if (cancelled) return
        setQuestions(next)
        setLoading(false)
      },
      error: (error) => {
        if (cancelled) return
        console.error('Failed to observe questions:', error)
        setLoading(false)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [key])

  return { questions, loading }
}
