import { createFileRoute } from '@tanstack/react-router'

import { DebugEmbeddingPage } from '#/features/tutor/components/DebugEmbeddingPage'

export const Route = createFileRoute('/debug/embedding')({
  component: DebugEmbeddingPage,
})
