import { createFileRoute } from '@tanstack/react-router'

import { PrivacyPage } from '#/features/privacy/components/PrivacyPage'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})