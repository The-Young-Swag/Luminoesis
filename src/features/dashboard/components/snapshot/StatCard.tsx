import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

type StatCardProps = {
  icon?: ReactNode
  label: string
  value: string
  hint: string
  delta?: string | null
  spark?: number[]
  sparkDays?: boolean
  to?: string
}

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function StatCard({ icon, label, value, hint, delta, spark, sparkDays = false, to }: StatCardProps) {
  const inner = (
    <>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-(--accent) opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-15"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-2">
        {icon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--surface-muted) text-(--ink-soft) transition-colors group-hover:bg-(--accent-soft) group-hover:text-(--accent)">
            {icon}
          </span>
        )}

        <span className="truncate text-[15px] font-semibold">{label}</span>

        {to && (
          <ArrowUpRight
            size={14}
            className="ml-auto text-(--ink-faint) opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>

      <div className="display relative mt-3 text-4xl tabular-nums">{value}</div>

      {spark && spark.length > 0 && (
        <div className="relative mt-3">
          <div aria-hidden="true" className="flex h-7 items-end gap-1">
            {spark.map((count, index) => {
              const max = Math.max(...spark, 1)
              const height = Math.max(8, Math.round((count / max) * 100))
              const isLast = index === spark.length - 1
              return (
                <span
                  key={index}
                  style={{ height: `${height}%` }}
                  className={`w-full rounded-full ${
                    count === 0
                      ? 'bg-(--line)'
                      : isLast
                        ? 'bg-(--emerald)'
                        : 'bg-(--accent)/45'
                  }`}
                />
              )
            })}
          </div>

          {sparkDays && (
            <div aria-hidden="true" className="mt-1.5 flex gap-1 text-[11px] text-(--ink-soft)">
              {WEEKDAY_LETTERS.slice(0, spark.length).map((day, index) => (
                <span key={index} className="w-full text-center">
                  {day}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative mt-1 text-[13px] text-(--ink-soft)">{hint}</div>

      {delta && (
        <div className="relative mt-2 inline-flex items-center gap-1 rounded-full border border-(--line) bg-(--surface-muted) px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-(--ink-soft)">
          <span aria-hidden="true">
            {delta.startsWith('+') ? '↑' : delta.startsWith('−') || delta.startsWith('-') ? '↓' : '→'}
          </span>
          {delta}
        </div>
      )}
    </>
  )

  const className =
    'group relative block h-full overflow-hidden rounded-2xl border border-(--line) bg-(--surface-raised) p-4 transition-colors hover:border-(--accent-line)'

  if (to) {
    return (
      <Link
        to={to}
        aria-label={`${label}: ${value} — ${hint}`}
        className={`${className} no-underline focus-visible:outline-2`}
      >
        {inner}
      </Link>
    )
  }

  return <div className={className}>{inner}</div>
}
