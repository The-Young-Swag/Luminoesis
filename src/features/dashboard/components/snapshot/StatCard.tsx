import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string
  hint: string
  to?: string
}

export function StatCard({ icon, label, value, hint, to }: StatCardProps) {
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

      <div className="display relative mt-3 text-2xl">{value}</div>
      <div className="relative mt-1 text-xs text-(--ink-soft)">{hint}</div>
    </>
  )

  const className =
    'group relative block overflow-hidden rounded-2xl border border-(--line) bg-(--surface-raised) p-4 transition-colors hover:border-(--veridian)/40'

  if (to) {
    return (
      <a href={to} className={`${className} no-underline`}>
        {inner}
      </a>
    )
  }

  return <div className={className}>{inner}</div>
}
