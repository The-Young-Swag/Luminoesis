import type { ReactNode } from 'react'

type PanelHeaderProps = {
  icon?: ReactNode
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  iconClassName?: string
}

export function PanelHeader({
  icon,
  eyebrow,
  title,
  description,
  action,
  iconClassName,
}: PanelHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--surface-muted) text-(--ink-soft) ${iconClassName ?? ''}`}
          >
            {icon}
          </span>
        )}

        <div className="min-w-0">
          {eyebrow && <p className="mono-label">{eyebrow}</p>}

          <h2 className={eyebrow ? 'mt-1 text-sm font-semibold' : 'text-sm font-semibold'}>
            {title}
          </h2>

          {description && (
            <p className="mt-1 max-w-xl text-xs leading-5 text-(--ink-faint)">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
