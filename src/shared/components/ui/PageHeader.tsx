import { Search } from 'lucide-react'

type PageHeaderProps = {
  title: string
  context: string
  action?: React.ReactNode
  onOpenPalette: () => void
}

/*
 * One page header for every page: title + context line on the left,
 * jump-to-search on the right. Dashboard passes the date as context;
 * other pages pass their one-line description.
 */
export function PageHeader({
  title,
  context,
  action,
  onOpenPalette,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="display truncate text-[28px] leading-tight tracking-tight">
          {title}
        </h1>
        <p className="mt-1 truncate text-sm text-(--ink-soft)">{context}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {action}
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Jump to any page"
          className="glass-pill hidden h-11 min-w-52 items-center gap-2.5 px-4 text-sm text-(--ink-soft) transition-colors hover:text-(--ink) sm:inline-flex"
        >
          <Search size={15} aria-hidden="true" className="shrink-0" />
          <span className="flex-1 truncate text-left">Jump to…</span>
          <kbd
            aria-hidden="true"
            className="shrink-0 rounded-md border border-(--line) bg-(--surface-muted) px-1.5 py-0.5 font-mono text-[10px]"
          >
            ⌘K
          </kbd>
        </button>
      </div>
    </div>
  )
}
