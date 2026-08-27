import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/learning-spaces')({
  component: LearningSpaceLayout,
})

function LearningSpaceLayout() {
  return <Outlet />
}
