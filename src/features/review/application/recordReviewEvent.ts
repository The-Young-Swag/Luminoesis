import { z } from 'zod'

import { createReviewEventId } from '#/features/review/domain/ids'
import type { ReviewEvent } from '#/features/review/domain/reviewEvent'
import { reviewEventRepository } from '#/features/review/repositories/reviewEventRepository'
import { GradeSchema } from '#/features/review/schemas'

const RecordReviewEventSchema = z.object({
  conceptId: z.string().trim().min(1),
  objectType: z.enum([
    'flashcard',
    'quiz-question',
    'brain-trainer',
  ]),
  objectId: z.string().trim().min(1),
  grade: GradeSchema,
  durationMs: z.number().nonnegative().optional(),
})

export type RecordReviewEventInput = z.input<
  typeof RecordReviewEventSchema
>

export async function recordReviewEvent(
  input: RecordReviewEventInput,
): Promise<ReviewEvent> {
  const data = RecordReviewEventSchema.parse(input)

  const event: ReviewEvent = {
    id: createReviewEventId(),
    conceptId: data.conceptId,
    objectType: data.objectType,
    objectId: data.objectId,
    grade: data.grade,
    timestamp: Date.now(),
    durationMs: data.durationMs,
  }

  await reviewEventRepository.create(event)

  return event
}
