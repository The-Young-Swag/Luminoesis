import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

/**
 * Consistent "nothing here yet" panel. Used across Materials, Concepts,
 * Flashcards, and Practice so an empty workspace still feels intentional
 * and calm rather than broken or unfinished.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rise flex flex-col items-center gap-5 rounded-3xl border border-dashed border-(--line-strong) bg-(--surface-muted)/50 px-8 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-(--surface) text-(--ink-soft) shadow-sm">
        <Icon size={24} aria-hidden="true" />
      </span>

      <div className="max-w-md">
        <h3 className="text-base font-semibold text-(--ink)">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-(--ink-soft)">{description}</p>
      </div>

      {action}
    </div>
  )
}