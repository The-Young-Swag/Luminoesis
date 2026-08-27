import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import type { Material } from '#/features/learning-space/domain/learningSpace'
import type { Flashcard } from '#/features/flashcard/domain/flashcard'
import { flashcardRepository } from '#/features/flashcard/repositories/flashcardRepository'
import { conceptRepository } from '#/features/learning-space/repositories/conceptRepository'
import { materialRepository } from '#/features/learning-space/repositories/materialRepository'

function isDue(dueDate: string, today = new Date()): boolean {
  return toISODate(today) >= dueDate
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export type FlashcardReviewQueue = {
  due: Flashcard[]
  conceptTitleById: Map<string, string>
  materialTitleById: Map<string, string>
  ready: boolean
}

export function useFlashcardReviewQueue(): FlashcardReviewQueue {
  const [due, setDue] = useState<Flashcard[]>([])
  const [conceptTitleById, setConceptTitleById] = useState<
    Map<string, string>
  >(new Map())
  const [materialTitleById, setMaterialTitleById] = useState<
    Map<string, string>
  >(new Map())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const subscription = liveQuery(async () => {
      const [allFlashcards, allConcepts, allMaterials] =
        await Promise.all([
          flashcardRepository.findAll(),
          conceptRepository.findAll(),
          materialRepository.findAll(),
        ])

      const today = new Date()

      return {
        dueFlashcards: allFlashcards.filter((flashcard) =>
          isDue(flashcard.dueDate, today),
        ),
        concepts: allConcepts,
        materials: allMaterials,
      }
    }).subscribe({
      next: ({ dueFlashcards, concepts, materials }) => {
        if (cancelled) {
          return
        }

        setDue(dueFlashcards)

        setConceptTitleById(
          new Map<string, string>(
            concepts.map((concept: Concept) => [
              concept.id,
              concept.name,
            ]),
          ),
        )

        setMaterialTitleById(
          new Map<string, string>(
            materials.map((material: Material) => [
              material.id,
              material.title,
            ]),
          ),
        )

        setReady(true)
      },

      error: (error) => {
        if (cancelled) {
          return
        }

        console.error('Failed to observe flashcard review queue:', error)

        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { due, conceptTitleById, materialTitleById, ready }
}
