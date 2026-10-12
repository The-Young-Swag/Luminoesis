import type { LucideIcon } from 'lucide-react'

type SectionHeaderProps = {
  icon: LucideIcon
  title: string
  description?: string
  meta?: string
  action?: React.ReactNode
}

/**
 * Consistent header used at the top of every workspace section (Materials,
 * Concepts, Flashcards, Practice, Brain Trainer). Keeping this in one place
 * is what makes the sections read as one coherent page instead of five
 * independently-styled widgets.
 */
export function SectionHeader({
  icon: Icon,
  title,
  description,
  meta,
  action,
}: SectionHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-(--surface-muted) text-(--veridian)">
          <Icon size={20} aria-hidden="true" />
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="display text-xl leading-tight">{title}</h2>
            {meta && <span className="chip">{meta}</span>}
          </div>

          {description && (
            <p className="mt-2 max-w-xl text-sm leading-6 text-(--ink-soft)">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}