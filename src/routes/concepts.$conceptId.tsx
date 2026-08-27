import { createFileRoute } from '@tanstack/react-router'

import { ConceptDetailPage } from '#/features/learning-space/components/ConceptDetailPage'

export const Route = createFileRoute('/concepts/$conceptId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { conceptId } = Route.useParams()

  return <ConceptDetailPage conceptId={conceptId} />
}
