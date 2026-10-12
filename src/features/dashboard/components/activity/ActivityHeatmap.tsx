type HeatmapData = {
  weeks: number[][]
  total: number
  bestDay: string
  startDate: number
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function cellBackground(count: number): string {
  if (count === 0) return 'var(--surface-muted)'
  const alpha = count >= 10 ? 100 : count >= 6 ? 75 : count >= 3 ? 50 : 30
  return `color-mix(in oklab, var(--veridian) ${alpha}%, var(--surface-muted))`
}

function dayLabel(startDate: number, week: number, day: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(startDate + (week * 7 + day) * MILLISECONDS_PER_DAY))
}

export function ActivityHeatmap({ data }: { data: HeatmapData }) {
  return (
    <section aria-labelledby="activity-heading" className="card-flat p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="activity-heading" className="text-sm font-semibold">
            Review activity
          </h2>
          <p className="mt-0.5 text-xs text-(--ink-faint)">
            Every review, on this device only.
          </p>
        </div>
        <span className="chip hidden shrink-0 sm:inline-flex">Last 12 weeks</span>
      </div>

      <p className="sr-only">
        {data.total} reviews in the last 12 weeks
        {data.total > 0 ? `, most active on ${data.bestDay.toLowerCase()}` : ''}.
      </p>

      <div aria-hidden="true" className="mt-4 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-[3px]">
          {data.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((count, dayIndex) => (
                <span
                  key={dayIndex}
                  title={`${count} review${count === 1 ? '' : 's'} · ${dayLabel(data.startDate, weekIndex, dayIndex)}`}
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
        className="mt-3 flex items-center justify-end gap-1.5 font-mono text-[10px] text-(--ink-faint)"
      >
        <span>Less</span>
        {[0, 2, 4, 7, 12].map((count) => (
          <span
            key={count}
            className="h-3 w-3 rounded-[3px]"
            style={{ background: cellBackground(count) }}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  )
}
