import { z } from 'zod'

import { createFlashcardId } from '#/features/flashcard/domain/ids'
import type { Flashcard } from '#/features/flashcard/domain/flashcard'
import { flashcardRepository } from '#/features/flashcard/repositories/flashcardRepository'
import { initialState, sm2 } from '#/features/review/domain/sm2'
import { GradeSchema } from '#/features/review/schemas'
import { recordReviewEvent } from '#/features/review/application/recordReviewEvent'

const CreateFlashcardSchema = z.object({
  conceptId: z.string().trim().min(1),
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  materialId: z.string().trim().min(1).optional(),
  highlightId: z.string().trim().min(1).optional(),
})

export type CreateFlashcardInput = z.input<
  typeof CreateFlashcardSchema
>

export async function createFlashcard(
  input: CreateFlashcardInput,
): Promise<Flashcard> {
  const data = CreateFlashcardSchema.parse(input)
  const now = Date.now()
  const init = initialState()

  const flashcard: Flashcard = {
    id: createFlashcardId(),
    conceptId: data.conceptId,
    front: data.front,
    back: data.back,
    difficulty: data.difficulty,
    materialId: data.materialId,
    highlightId: data.highlightId,
    createdAt: now,
    updatedAt: now,
    interval: init.interval,
    repetitions: init.repetitions,
    easeFactor: init.easeFactor,
    dueDate: toISODate(new Date()),
  }

  await flashcardRepository.create(flashcard)

  return flashcard
}

const UpdateFlashcardSchema = z.object({
  conceptId: z.string().trim().min(1).optional(),
  front: z.string().trim().min(1).optional(),
  back: z.string().trim().min(1).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  materialId: z.string().trim().min(1).optional(),
  highlightId: z.string().trim().min(1).optional(),
})

export type UpdateFlashcardInput = z.input<
  typeof UpdateFlashcardSchema
>

export async function updateFlashcard(
  id: string,
  input: UpdateFlashcardInput,
): Promise<Flashcard> {
  const data = UpdateFlashcardSchema.parse(input)

  await flashcardRepository.update(id, {
    ...data,
    updatedAt: Date.now(),
  })

  const updated = await flashcardRepository.findById(id)

  if (!updated) {
    throw new Error('Flashcard not found after update.')
  }

  return updated
}

export async function deleteFlashcard(id: string): Promise<void> {
  await flashcardRepository.delete(id)
}

const GradeFlashcardSchema = z.object({
  flashcardId: z.string().trim().min(1),
  grade: GradeSchema,
  startedAt: z.number().optional(),
})

export type GradeFlashcardInput = z.input<
  typeof GradeFlashcardSchema
>

export type GradeFlashcardResult = {
  nextDueDate: string
  conceptId: string
}

/**
 * Records a learner response for one flashcard.
 *
 * Reuses the existing pure SM-2 scheduler (no second algorithm) and writes a
 * concept-aware ReviewEvent that feeds Concept mastery aggregation.
 */
export async function gradeFlashcard(
  input: GradeFlashcardInput,
): Promise<GradeFlashcardResult> {
  const data = GradeFlashcardSchema.parse(input)

  const flashcard = await flashcardRepository.findById(data.flashcardId)

  if (!flashcard) {
    throw new Error('Flashcard not found.')
  }

  const result = sm2(
    {
      interval: flashcard.interval,
      repetitions: flashcard.repetitions,
      easeFactor: flashcard.easeFactor,
    },
    data.grade,
  )

  await flashcardRepository.update(flashcard.id, {
    interval: result.interval,
    repetitions: result.repetitions,
    easeFactor: result.easeFactor,
    dueDate: result.dueDate,
    lastReviewed: new Date().toISOString(),
    updatedAt: Date.now(),
  })

  await recordReviewEvent({
    conceptId: flashcard.conceptId,
    objectType: 'flashcard',
    objectId: flashcard.id,
    grade: data.grade,
    durationMs: data.startedAt
      ? Math.max(0, Date.now() - data.startedAt)
      : undefined,
  })

  return {
    nextDueDate: result.dueDate,
    conceptId: flashcard.conceptId,
  }
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
