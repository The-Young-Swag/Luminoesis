import { RetentionBars } from '#/features/dashboard/components/retention/RetentionBars'

import { EmptyTopicState } from './EmptyTopicState'

export function RetentionPanel({ data }: { data: Array<{ topic: string; rate: number }> }) {
  return (
    <section className="card-flat p-5 md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mono-label">Performance</p>
          <h2 className="mt-1 text-sm font-semibold">Retention by topic</h2>
          <p className="mt-1 text-xs text-(--ink-faint)">Where your recent review history is strongest</p>
        </div>

        <span className="chip hidden sm:inline-flex">Actual review history</span>
      </div>

      <div className="mt-5">{data.length > 0 ? <RetentionBars data={data} /> : <EmptyTopicState />}</div>
    </section>
  )
}
