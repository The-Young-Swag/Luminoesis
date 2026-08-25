import { Activity, Clock3, Layers, TrendingUp } from 'lucide-react'

import { gainFrameDue } from '#/shared/lib/engagement-copy'

import { SectionHeading } from '#/features/dashboard/components/layout/SectionHeading'
import { StatCard } from '#/features/dashboard/components/snapshot/StatCard'

type SnapshotStatsProps = {
  studyMinutesThisWeek: number
  recentReviewCount: number
  recallValue: string
  recallHint: string
  dueTodayCount: number
}

export function SnapshotStats({
  studyMinutesThisWeek,
  recentReviewCount,
  recallValue,
  recallHint,
  dueTodayCount,
}: SnapshotStatsProps) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <SectionHeading eyebrow="Today" title="Your learning snapshot" />
        <span className="chip hidden sm:inline-flex">Last 7 days</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Clock3 size={16} />} label="Study time" value={`${studyMinutesThisWeek}m`} hint="Last 7 days" />
        <StatCard icon={<Layers size={16} />} label="Reviews" value={String(recentReviewCount)} hint="Last 7 days" />
        <StatCard icon={<TrendingUp size={16} />} label="Recall" value={recallValue} hint={recallHint} />
        <StatCard
          icon={<Activity size={16} />}
          label="Due"
          value={String(dueTodayCount)}
          hint={dueTodayCount > 0 ? gainFrameDue(dueTodayCount) : 'Nothing waiting'}
        />
      </div>
    </section>
  )
}
