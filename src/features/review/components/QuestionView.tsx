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
  return (
    <div className="min-h-40 flex flex-col">
      <div className="text-xs tracking-wide uppercase font-semibold text-(--ink-faint)">
        Front
      </div>
      <div className="text-[18px] leading-relaxed font-medium mt-2">
        {front}
      </div>

      <div className="mt-6">
        {!showBack ? (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={onShowBack}
          >
            <Eye size={16} aria-hidden="true" /> Show answer
          </button>
        ) : (
          <div className="rounded-xl border border-(--line) bg-(--surface-muted) p-4">
            <div className="text-xs tracking-wide uppercase font-semibold text-(--ink-faint)">
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