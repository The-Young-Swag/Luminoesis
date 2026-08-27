import { useMemo } from 'react'

import { useFlashcardReviewQueue } from '#/features/flashcard/hooks/useFlashcardReview'
import { useQuestions } from '#/features/quiz/hooks/useQuestions'
import { buildBrainTrainerQueue } from '#/features/brain-trainer/application/brainTrainer'
import type { BuildBrainTrainerQueueInput } from '#/features/brain-trainer/application/brainTrainer'
import type { BrainTrainerItem } from '#/features/brain-trainer/domain/brainTrainer'

export function useBrainTrainer(conceptIds: string[]): {
  items: BrainTrainerItem[]
  loading: boolean
} {
  const { due, ready } = useFlashcardReviewQueue()
  const { questions, loading: questionsLoading } = useQuestions(conceptIds)

  const items = useMemo(() => {
    const scopedFlashcards = due
      .filter((flashcard) => conceptIds.includes(flashcard.conceptId))
      .map((flashcard) => ({
        id: flashcard.id,
        conceptId: flashcard.conceptId,
        front: flashcard.front,
        back: flashcard.back,
      }))

    const input: BuildBrainTrainerQueueInput = {
      dueFlashcards: scopedFlashcards,
      questions: questions.map((question) => ({
        id: question.id,
        conceptId: question.conceptId,
        prompt: question.prompt,
        answer: question.answer,
        type: question.type,
      })),
    }

    return buildBrainTrainerQueue(input)
  }, [due, questions, conceptIds.join(',')])

  return { items, loading: !ready || questionsLoading }
}
