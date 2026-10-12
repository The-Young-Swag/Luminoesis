import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/flashcards')({
  beforeLoad: () => {
    throw redirect({
      to: '/review',
      search: { tab: 'flashcards' },
    })
  },
})
