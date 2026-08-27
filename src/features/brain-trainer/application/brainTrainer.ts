import { z } from 'zod'

import type { Grade } from '#/features/review/domain/sm2'
import { recordReviewEvent } from '#/features/review/application/recordReviewEvent'
import type { QuestionType } from '#/features/quiz/domain/question'
import type { BrainTrainerItem } from '#/features/brain-trainer/domain/brainTrainer'

export type BuildBrainTrainerQueueInput = {
  dueFlashcards: Array<{ id: string; conceptId: string; front: string; back: string }>
  questions: Array<{
    id: string
    conceptId: string
    prompt: string
    answer: string
    type: QuestionType
  }>
  flashcardLimit?: number
  questionLimit?: number
  totalLimit?: number
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Build a balanced, shuffled mixed drill from due flashcards and a sample of
 * quiz questions. Both coexist in the same queue so the learner reinforces
 * concepts through multiple recall formats.
 */
export function buildBrainTrainerQueue(
  input: BuildBrainTrainerQueueInput,
): BrainTrainerItem[] {
  const {
    dueFlashcards,
    questions,
    flashcardLimit = 5,
    questionLimit = 5,
    totalLimit = 10,
  } = input

  const flashcardItems: BrainTrainerItem[] = shuffle(dueFlashcards)
    .slice(0, flashcardLimit)
    .map((flashcard) => ({
      id: flashcard.id,
      kind: 'flashcard' as const,
      conceptId: flashcard.conceptId,
      prompt: flashcard.front,
      answer: flashcard.back,
    }))

  const questionItems: BrainTrainerItem[] = shuffle(questions)
    .slice(0, questionLimit)
    .map((question) => ({
      id: question.id,
      kind: 'question' as const,
      conceptId: question.conceptId,
      prompt: question.prompt,
      answer: question.answer,
      questionType: question.type,
    }))

  return shuffle([...flashcardItems, ...questionItems]).slice(0, totalLimit)
}

const SubmitBrainTrainerAnswerSchema = z.object({
  item: z.object({
    id: z.string().min(1),
    conceptId: z.string().min(1),
  }),
  grade: z.number().int().min(0).max(3),
  durationMs: z.number().nonnegative().optional(),
})

export type SubmitBrainTrainerAnswerInput = z.input<
  typeof SubmitBrainTrainerAnswerSchema
>

/**
 * Records a single Brain Trainer response as a concept-aware ReviewEvent.
 */
export async function submitBrainTrainerAnswer(
  input: SubmitBrainTrainerAnswerInput,
): Promise<void> {
  const data = SubmitBrainTrainerAnswerSchema.parse(input)

  await recordReviewEvent({
    conceptId: data.item.conceptId,
    objectType: 'brain-trainer',
    objectId: data.item.id,
    grade: data.grade as Grade,
    durationMs: data.durationMs,
  })
}
