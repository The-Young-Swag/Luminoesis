import { useEffect, useRef } from 'react'
import {
  HelpCircle,
  Highlighter,
  Lightbulb,
  MessageCircle,
  NotebookPen,
} from 'lucide-react'

export type ReaderSelection = {
  text: string
  rect: {
    top: number
    left: number
    bottom: number
    width: number
  }
}

type SelectionBubbleProps = {
  selection: ReaderSelection
  onAskTutor: (text: string) => void
  onCreateHighlight: (text: string) => void
  onCreateConcept: (text: string) => void
  onCreateFlashcard: (text: string) => void
  onCreateQuiz: (text: string) => void
  onDismiss: () => void
}

const PRIMARY_ACTIONS = [
  { key: 'ask', label: 'Ask Tutor', icon: MessageCircle, run: 'onAskTutor' },
  { key: 'highlight', label: 'Highlight', icon: Highlighter, run: 'onCreateHighlight' },
  { key: 'concept', label: 'Concept', icon: Lightbulb, run: 'onCreateConcept' },
] as const

const SECONDARY_ACTIONS = [
  { key: 'flashcard', label: 'Flashcard', icon: NotebookPen, run: 'onCreateFlashcard' },
  { key: 'quiz', label: 'Quiz', icon: HelpCircle, run: 'onCreateQuiz' },
] as const

const EDGE_MARGIN = 150

export function SelectionBubble({
  selection,
  onAskTutor,
  onCreateHighlight,
  onCreateConcept,
  onCreateFlashcard,
  onCreateQuiz,
  onDismiss,
}: SelectionBubbleProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { text, rect } = selection

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && ref.current.contains(event.target as Node)) {
        return
      }

      onDismiss()
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [onDismiss])

  const above = rect.top > 76
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, EDGE_MARGIN),
    (typeof window !== 'undefined' ? window.innerWidth : 1024) - EDGE_MARGIN,
  )

  const style: React.CSSProperties = {
    position: 'fixed',
    top: above ? rect.top : rect.bottom,
    left,
    transform: above
      ? 'translate(-50%, calc(-100% - 12px))'
      : 'translate(-50%, 12px)',
    zIndex: 60,
  }

  const handlers: Record<string, (text: string) => void> = {
    onAskTutor,
    onCreateHighlight,
    onCreateConcept,
    onCreateFlashcard,
    onCreateQuiz,
  }

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Selection actions"
      className="rise flex items-center gap-1 rounded-2xl border border-(--glass-border) bg-(--glass-bg-strong) p-1.5 shadow-2xl backdrop-blur-xl"
      style={style}
      onMouseDown={(event) => event.preventDefault()}
    >
      {PRIMARY_ACTIONS.map((action, index) => {
        const Icon = action.icon
        const isPrimary = index === 0

        return (
          <button
            key={action.key}
            type="button"
            onClick={() => handlers[action.run](text)}
            className={
              isPrimary
                ? 'flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-(--blue) transition hover:bg-(--blue)/12'
                : 'flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)'
            }
          >
            <Icon size={16} aria-hidden="true" />
            {action.label}
          </button>
        )
      })}

      <div className="mx-1 h-5 w-px shrink-0 bg-(--glass-border)" aria-hidden="true" />

      {SECONDARY_ACTIONS.map((action) => {
        const Icon = action.icon

        return (
          <button
            key={action.key}
            type="button"
            onClick={() => handlers[action.run](text)}
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
          >
            <Icon size={16} aria-hidden="true" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}