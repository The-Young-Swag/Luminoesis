import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string
  hint: string
  delta?: string | null
  spark?: number[]
  to?: string
}

export function StatCard({ icon, label, value, hint, delta, spark, to }: StatCardProps) {
  const inner = (
    <>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-(--veridian) opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-15"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--surface-muted) text-(--ink-soft) transition-colors group-hover:bg-(--veridian-muted) group-hover:text-(--veridian)">
          {icon}
        </span>

        <span className="mono-label truncate">{label}</span>

        {to && (
          <ArrowUpRight
            size={14}
            className="ml-auto text-(--ink-faint) opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>

      <div className="display relative mt-3 text-2xl tabular-nums">{value}</div>

      {spark && spark.length > 0 && (
        <div aria-hidden="true" className="relative mt-3 flex h-7 items-end gap-1">
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
                      : 'bg-(--veridian)/45'
                }`}
              />
            )
          })}
        </div>
      )}

      <div className="relative mt-1 truncate text-xs text-(--ink-soft)">{hint}</div>

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
    'group relative block overflow-hidden rounded-2xl border border-(--line) bg-(--surface-raised) p-4 transition-colors hover:border-(--veridian)/40'

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
