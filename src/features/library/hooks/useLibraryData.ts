import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Card } from '#/features/library/domain/card'

import { seedIfEmpty } from '#/shared/lib/db/seed'
import { cardRepository } from '#/features/library/repositories/cardRepository'

export function useLibraryData(
  search: string,
  page: number,
  pageSize: number,
) {
  const [cards, setCards] = useState<Card[]>([])
  const [total, setTotal] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      try {
        await seedIfEmpty()

        if (cancelled) {
          return
        }

        const subscription = liveQuery(async () => {
          const offset = page * pageSize

          const [pageCards, totalCards] = await Promise.all([
            cardRepository.findPage({ offset, limit: pageSize, query: search }),
            cardRepository.count(search),
          ])

          return { pageCards, totalCards }
        }).subscribe({
          next: ({ pageCards, totalCards }) => {
            if (cancelled) {
              return
            }

            setCards(pageCards)
            setTotal(totalCards)
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
  }, [search, page, pageSize])

  return { cards, total, ready }
}