import { createFileRoute } from '@tanstack/react-router'

import { FlashcardReviewPage } from '#/features/flashcard/components/FlashcardReviewPage'

export const Route = createFileRoute('/flashcards')({
  component: FlashcardReviewPage,
})
