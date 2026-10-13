import { PanelHeader } from '#/features/dashboard/components/layout/PanelHeader'
import { RetentionBars } from '#/features/dashboard/components/retention/RetentionBars'

import { EmptyTopicState } from './EmptyTopicState'

export function RetentionPanel({ data }: { data: Array<{ topic: string; rate: number }> }) {
  return (
    <section className="card-flat p-5 md:p-6">
      <PanelHeader
        title="Retention by topic"
        description="Strongest first, from your review history"
      />

      <div className="mt-5">{data.length > 0 ? <RetentionBars data={data} /> : <EmptyTopicState />}</div>
    </section>
  )
}
