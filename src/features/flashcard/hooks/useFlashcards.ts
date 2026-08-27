import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Flashcard } from '#/features/flashcard/domain/flashcard'
import { flashcardRepository } from '#/features/flashcard/repositories/flashcardRepository'

export function useFlashcards(conceptIds: string[]) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [ready, setReady] = useState(false)

  const key = conceptIds.join(',')

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const subscription = liveQuery(() =>
      flashcardRepository.findByConceptIds(conceptIds),
    ).subscribe({
      next: (next) => {
        if (cancelled) {
          return
        }

        setFlashcards(next)
        setReady(true)
      },

      error: (error) => {
        if (cancelled) {
          return
        }

        console.error('Failed to observe flashcards:', error)

        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [key])

  return { flashcards, ready }
}
