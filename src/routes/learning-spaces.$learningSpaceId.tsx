import { createFileRoute } from '@tanstack/react-router'

import { LearningSpaceWorkspacePage } from '#/features/learning-space/components/LearningSpaceWorkspacePage'

export const Route = createFileRoute('/learning-spaces/$learningSpaceId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { learningSpaceId } = Route.useParams()

  return <LearningSpaceWorkspacePage learningSpaceId={learningSpaceId} />
}
