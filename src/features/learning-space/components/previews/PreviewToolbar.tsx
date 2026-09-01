import { Minus, Plus, Maximize2 } from 'lucide-react'

export type PreviewToolbarProps = {
  zoom: number
  minZoom: number
  maxZoom: number
  onZoomOut: () => void
  onZoomIn: () => void
  onReset: () => void
  onFit?: () => void
  fitLabel?: string
  label?: string
}

export function PreviewToolbar({
  zoom,
  minZoom,
  maxZoom,
  onZoomOut,
  onZoomIn,
  onReset,
  onFit,
  fitLabel = 'Fit',
  label = 'View',
}: PreviewToolbarProps) {
  const percentage = Math.round(zoom * 100)

  return (
    <div className="sticky top-3 z-20 mb-4 flex items-center justify-between gap-3 rounded-xl border border-(--glass-border) bg-(--glass-bg-strong) px-2 py-1.5 shadow-sm backdrop-blur-xl">
      <span className="hidden pl-2 text-[11px] font-medium text-(--ink-faint) sm:block">
        {label}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={zoom <= minZoom}
          aria-label="Zoom out"
          title="Zoom out"
          className="grid h-8 w-8 place-items-center rounded-lg text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink) disabled:pointer-events-none disabled:opacity-35"
        >
          <Minus size={15} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onReset}
          aria-label={`Reset zoom to ${percentage}%`}
          title="Reset zoom"
          className="min-w-14 rounded-lg px-2 py-1.5 text-center font-mono text-[11px] font-medium tabular-nums text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
        >
          {percentage}%
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          disabled={zoom >= maxZoom}
          aria-label="Zoom in"
          title="Zoom in"
          className="grid h-8 w-8 place-items-center rounded-lg text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink) disabled:pointer-events-none disabled:opacity-35"
        >
          <Plus size={15} aria-hidden="true" />
        </button>

        {onFit && (
          <>
            <span className="mx-1 h-5 w-px bg-(--line)" aria-hidden="true" />
            <button
              type="button"
              onClick={onFit}
              aria-label={fitLabel}
              title={fitLabel}
              className="grid h-8 place-items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink) sm:flex"
            >
              <Maximize2 size={13} aria-hidden="true" />
              <span className="hidden sm:inline">{fitLabel}</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
