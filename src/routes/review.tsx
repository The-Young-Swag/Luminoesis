import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ReviewPage } from '#/features/review/components/ReviewPage'

const reviewSearchSchema = z.object({
  tab: z.enum(['cards', 'flashcards']).optional(),
  topic: z.string().min(1).max(80).optional(),
})

export const Route = createFileRoute('/review')({
  validateSearch: reviewSearchSchema,
  component: ReviewPage,
})
