import { useEffect, useRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type QuestionViewProps = {
  front: string
  back: string
  showBack: boolean
  onShowBack: () => void
  onHideBack: () => void
}

export function QuestionView({
  front,
  back,
  showBack,
  onShowBack,
  onHideBack,
}: QuestionViewProps) {
  const showRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (
      !showBack &&
      window.matchMedia('(pointer: fine)').matches
    ) {
      showRef.current?.focus()
    }
  }, [front, showBack])

  return (
    <div className="min-h-40 flex flex-col">
      <div className="text-xs tracking-wide uppercase font-semibold text-(--ink-soft)">
        Front
      </div>
      <div className="display text-balance text-[22px] leading-snug font-medium mt-2 md:text-2xl">
        {front}
      </div>

      <div className="mt-6">
        {!showBack ? (
          <button
            ref={showRef}
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={onShowBack}
          >
            <Eye size={16} aria-hidden="true" /> Show answer
          </button>
        ) : (
          <div className="rounded-xl border border-(--line) bg-(--surface-muted) p-4">
            <div className="text-xs tracking-wide uppercase font-semibold text-(--ink-soft)">
              Back
            </div>
            <div className="text-[16px] leading-relaxed mt-1">{back}</div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-(--ink-soft) underline-offset-2 hover:text-(--ink) hover:underline"
              onClick={onHideBack}
            >
              <EyeOff size={12} aria-hidden="true" /> Hide
            </button>
          </div>
        )}
      </div>
    </div>
  )
}