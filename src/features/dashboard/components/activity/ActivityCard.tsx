import { PanelHeader } from '#/features/dashboard/components/layout/PanelHeader'
import { formatRelativeTime } from '#/shared/lib/dates'

import type { RecentActivityItem } from '#/features/dashboard/hooks/useDashboardAnalytics'

type HeatmapData = {
  weeks: number[][]
  total: number
  bestDay: string
  startDate: number
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

const GRADE_LABELS = ['Again', 'Hard', 'Good', 'Easy'] as const

function gradeTone(grade: number): string {
  if (grade >= 2) return 'text-(--accent)'
  if (grade === 1) return 'text-(--warning-strong)'
  return 'text-(--warning-strong)'
}

function cellBackground(count: number): string {
  if (count === 0) return 'var(--surface-muted)'
  const alpha = count >= 10 ? 100 : count >= 6 ? 75 : count >= 3 ? 50 : 30
  return `color-mix(in oklab, var(--accent) ${alpha}%, var(--surface-muted))`
}

function dayLabel(startDate: number, week: number, day: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(startDate + (week * 7 + day) * MILLISECONDS_PER_DAY))
}

/*
 * Single activity module (mockup v5 "Recent activity"): latest reviews
 * newest-first + 12-week heatmap in one card, one header. Replaces the
 * split ActivityHeatmap + RecentActivity pair that left dead space beside
 * the recent list. Dates stay relative.
 */
export function ActivityCard({
  items,
  heatmap,
}: {
  items: RecentActivityItem[]
  heatmap: HeatmapData
}) {
  return (
    <div className="card-flat flex h-full flex-col p-5 md:p-6">
      <PanelHeader
        title="Recent activity"
        description="Latest reviews, newest first"
      />

      {items.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-(--ink-soft)">
          No activity yet — start a review.
        </p>
      ) : (
        <ol className="mt-2">
          {items.slice(0, 3).map((item) => (
            <li
              key={item.id}
              className="flex min-h-10 items-center gap-2.5 text-[13.5px]"
            >
              <span
                className={`shrink-0 text-xs font-semibold ${gradeTone(item.grade)}`}
              >
                {GRADE_LABELS[item.grade]}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <time
                dateTime={new Date(item.timestamp).toISOString()}
                className="shrink-0 text-xs text-(--ink-soft)"
              >
                {formatRelativeTime(item.timestamp)}
              </time>
            </li>
          ))}
        </ol>
      )}

      {heatmap.total > 0 && (
        <>
          <p className="sr-only">
            {heatmap.total} reviews in the last 12 weeks
            {heatmap.total > 0 ? `, most active on ${heatmap.bestDay.toLowerCase()}` : ''}.
          </p>

          <div
            aria-hidden="true"
            role="img"
            aria-label={`Review activity over the last 12 weeks, ${heatmap.total} reviews`}
            className="mt-4 overflow-x-auto pb-1"
          >
            <div className="flex min-w-max gap-[3px]">
              {heatmap.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((count, dayIndex) => (
                    <span
                      key={dayIndex}
                      title={`${count} review${count === 1 ? '' : 's'} · ${dayLabel(heatmap.startDate, weekIndex, dayIndex)}`}
                      className="h-3 w-3 rounded-[3px]"
                      style={{ background: cellBackground(count) }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div
            aria-hidden="true"
            className="mt-2 flex items-center gap-1 text-[11px] text-(--ink-soft)"
          >
            Less
            {[0, 2, 4, 7, 12].map((count) => (
              <span
                key={count}
                className="h-[11px] w-[11px] rounded-[3px]"
                style={{ background: cellBackground(count) }}
              />
            ))}
            More
          </div>
        </>
      )}
    </div>
  )
}
