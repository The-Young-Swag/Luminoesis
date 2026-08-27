import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type {
  Concept,
  Highlight,
  Material,
} from '#/features/learning-space/domain/learningSpace'
import { conceptRepository } from '#/features/learning-space/repositories/conceptRepository'
import { learningSpaceRepository } from '#/features/learning-space/repositories/learningSpaceRepository'
import { materialRepository } from '#/features/learning-space/repositories/materialRepository'
import { highlightRepository } from '#/features/learning-space/repositories/highlightRepository'
import type { Flashcard } from '#/features/flashcard/domain/flashcard'
import { flashcardRepository } from '#/features/flashcard/repositories/flashcardRepository'
import type { Question } from '#/features/quiz/domain/question'
import { questionRepository } from '#/features/quiz/repositories/questionRepository'

export type ConceptDetail = {
  concept: Concept | null | undefined
  learningSpace?: { id: string; title: string }
  materials: Material[]
  highlights: Highlight[]
  flashcards: Flashcard[]
  questions: Question[]
  ready: boolean
}

export function useConceptDetail(conceptId: string): ConceptDetail {
  const [state, setState] = useState<Omit<ConceptDetail, 'ready'>>({
    concept: undefined,
    materials: [],
    highlights: [],
    flashcards: [],
    questions: [],
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const subscription = liveQuery(async () => {
      const concept = await conceptRepository.findById(conceptId)

      if (!concept) {
        return { concept: null, materials: [], highlights: [], flashcards: [], questions: [] }
      }

      const [learningSpace, materials, highlights, flashcards, questions] =
        await Promise.all([
          learningSpaceRepository.findById(concept.learningSpaceId),
          materialRepository.findByLearningSpaceId(concept.learningSpaceId),
          highlightRepository.findByConceptId(conceptId),
          flashcardRepository.findByConceptId(conceptId),
          questionRepository.getByConceptIds([conceptId]),
        ])

      return {
        concept,
        learningSpace: learningSpace
          ? { id: learningSpace.id, title: learningSpace.title }
          : undefined,
        materials,
        highlights,
        flashcards,
        questions,
      }
    }).subscribe({
      next: (next) => {
        if (cancelled) {
          return
        }

        setState(next)
        setReady(true)
      },
      error: (error) => {
        if (cancelled) {
          return
        }

        console.error('Failed to observe concept detail:', error)
        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [conceptId])

  return { ...state, ready }
}
