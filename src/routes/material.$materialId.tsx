import { createFileRoute } from '@tanstack/react-router'

import { MaterialViewerPage } from '#/features/learning-space/components/MaterialViewerPage'

export const Route = createFileRoute('/material/$materialId')({
  component: MaterialViewerRoute,
})

function MaterialViewerRoute() {
  const { materialId } = Route.useParams()

  return <MaterialViewerPage materialId={materialId} />
}
