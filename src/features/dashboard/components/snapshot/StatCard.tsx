type StatCardProps = {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}

export function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-(--line) bg-(--surface-raised) p-4 transition-colors hover:border-(--veridian)/40">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-(--veridian) opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-15"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--surface-muted) text-(--ink-soft) transition-colors group-hover:bg-(--veridian-muted) group-hover:text-(--veridian)">
          {icon}
        </span>

        <span className="mono-label truncate">{label}</span>
      </div>

      <div className="display relative mt-3 text-2xl">{value}</div>
      <div className="relative mt-1 text-xs text-(--ink-soft)">{hint}</div>
    </div>
  )
}