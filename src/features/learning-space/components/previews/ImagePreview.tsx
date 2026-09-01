import { useState } from 'react'
import type { RefObject } from 'react'
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react'

type ImagePreviewProps = {
  fileUrl: string
  fileName: string
  contentRef?: RefObject<HTMLDivElement | null>
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1

export function ImagePreview({
  fileUrl,
  fileName,
  contentRef,
}: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1)

  const changeZoom = (delta: number) => {
    setZoom((current) =>
      Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number((current + delta).toFixed(2))),
      ),
    )
  }

  const resetZoom = () => setZoom(1)

  return (
    <div className="w-full min-w-0">
      <div className="sticky top-3 z-20 mb-4 flex items-center justify-end gap-1 rounded-xl border border-(--glass-border) bg-(--glass-bg-strong) px-2 py-1.5 shadow-sm backdrop-blur-xl">
        <span className="mr-2 hidden text-[11px] font-medium text-(--ink-faint) sm:block">
          Image view
        </span>

        <button
          type="button"
          onClick={() => changeZoom(-ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          title="Zoom out"
          className="grid h-8 w-8 place-items-center rounded-lg text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink) disabled:pointer-events-none disabled:opacity-35"
        >
          <Minus size={15} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={resetZoom}
          aria-label="Reset image zoom"
          title="Reset zoom"
          className="min-w-14 rounded-lg px-2 py-1.5 font-mono text-[11px] font-medium tabular-nums text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={() => changeZoom(ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          title="Zoom in"
          className="grid h-8 w-8 place-items-center rounded-lg text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink) disabled:pointer-events-none disabled:opacity-35"
        >
          <Plus size={15} aria-hidden="true" />
        </button>

        <span className="mx-1 h-5 w-px bg-(--line)" aria-hidden="true" />

        <button
          type="button"
          onClick={resetZoom}
          className="grid h-8 w-8 place-items-center rounded-lg text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
          aria-label="Fit image"
          title="Fit image"
        >
          <Maximize2 size={14} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={resetZoom}
          className="grid h-8 w-8 place-items-center rounded-lg text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink) sm:hidden"
          aria-label="Reset image"
          title="Reset image"
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </div>

      <div
        ref={contentRef}
        className="min-w-0 overflow-auto rounded-2xl border border-(--line) bg-(--surface-muted) p-3 sm:p-5"
      >
        <div className="flex min-w-full justify-center">
          <img
            src={fileUrl}
            alt={fileName}
            className="block h-auto max-w-none rounded-xl border border-(--line) bg-white shadow-sm"
            style={{
              width: `${zoom * 100}%`,
              maxWidth: zoom <= 1 ? '100%' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}