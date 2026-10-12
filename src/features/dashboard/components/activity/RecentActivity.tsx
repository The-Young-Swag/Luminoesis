
import { PanelHeader } from '#/features/dashboard/components/layout/PanelHeader'
import { formatRelativeTime } from '#/shared/lib/dates'

import type { RecentActivityItem } from '#/features/dashboard/hooks/useDashboardAnalytics'

const GRADE_LABELS = [
  'Again',
  'Hard',
  'Good',
  'Easy',
] as const

const GRADE_TONE_CLASS = {
  high: 'bg-(--accent-soft) text-(--ink)',
  mid: 'bg-(--warning-muted) text-(--warning-strong)',
  low: 'bg-(--destructive)/10 text-(--destructive)',
} as const

function gradeTone(
  grade: number,
): keyof typeof GRADE_TONE_CLASS {
  if (grade >= 2) return 'high'
  if (grade === 1) return 'mid'
  return 'low'
}

type RecentActivityProps = {
  items: RecentActivityItem[]
}

export function RecentActivity({
  items,
}: RecentActivityProps) {
  return (
    <div className="card-flat p-4 sm:p-5">
      <PanelHeader
        title="Recent activity"
        description="Your latest review outcomes, newest first"
      />

      {items.length === 0 ? (
        <p className="text-sm leading-6 text-(--ink-soft)">
          No activity yet — start a review.
        </p>
      ) : (
        <ol className="-mx-2">
          {items.map((item) => (
            <ActivityRow
              key={item.id}
              item={item}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function ActivityRow({
  item,
}: {
  item: RecentActivityItem
}) {
  const tone = gradeTone(item.grade)

  return (
    <li className="feed-row flex min-w-0 items-center gap-3 rounded-xl px-2 py-2.5">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${GRADE_TONE_CLASS[tone]}`}
        aria-hidden="true"
      >
        {GRADE_LABELS[item.grade].slice(0, 1)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="wrap-break-word text-sm leading-5">
          {item.label}
        </div>

        <div className="mt-0.5 wrap-break-word text-xs leading-5 text-(--ink-soft)">
          <time dateTime={new Date(item.timestamp).toISOString()}>
            {formatRelativeTime(item.timestamp)}
          </time>{' '}
          · {GRADE_LABELS[item.grade]}
        </div>
      </div>
    </li>
  )
}