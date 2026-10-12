import type { ReactNode } from 'react'

type PanelHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: PanelHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}

        <h2 className={eyebrow ? 'mt-1 text-[15px] font-semibold' : 'text-[15px] font-semibold'}>
          {title}
        </h2>

        {description && (
          <p className="mt-0.5 max-w-xl text-[13px] leading-5 text-(--ink-soft)">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
