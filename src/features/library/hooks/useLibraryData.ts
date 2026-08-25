import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Card } from '#/features/library/domain/card'

import { seedIfEmpty } from '#/shared/lib/db/seed'
import { cardRepository } from '#/features/library/repositories/cardRepository'

export function useLibraryData() {
  const [cards, setCards] = useState<Card[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      try {
        await seedIfEmpty()

        if (cancelled) {
          return
        }

        const subscription = liveQuery(() =>
          cardRepository.findAll(),
        ).subscribe({
          next: (nextCards) => {
            if (cancelled) {
              return
            }

            setCards(nextCards)
            setReady(true)
          },

          error: (error) => {
            if (cancelled) {
              return
            }

            console.error(
              'Failed to observe library data:',
              error,
            )

            setReady(true)
          },
        })

        return () => subscription.unsubscribe()
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(
          'Failed to initialize library data:',
          error,
        )

        setReady(true)
      }
    }

    let cleanup: (() => void) | undefined

    void initialize().then((unsubscribe) => {
      if (cancelled) {
        unsubscribe?.()
        return
      }

      cleanup = unsubscribe
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return { cards, ready }
}