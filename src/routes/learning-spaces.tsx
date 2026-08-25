import { createFileRoute } from '@tanstack/react-router'

import { LearningSpaceListPage } from '#/features/learning-space/components/LearningSpaceListPage'

export const Route = createFileRoute('/learning-spaces')({
  component: LearningSpaceListPage,
})