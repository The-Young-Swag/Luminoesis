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
      className="rise relative flex items-center gap-0.5 rounded-[11px] border border-(--line)/60 bg-(--surface)/90 p-[5px] shadow-[0_12px_32px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-[18px] before:absolute before:-bottom-[5px] before:left-1/2 before:h-[9px] before:w-[9px] before:-translate-x-1/2 before:rotate-45 before:rounded-br-[2px] before:border-r before:border-b before:border-(--line)/60 before:bg-(--surface)/90 before:content-['']"
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
                ? 'flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium text-(--blue) transition hover:bg-(--blue)/10'
                : 'flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)'
            }
          >
            <Icon size={14} aria-hidden="true" />
            {action.label}
          </button>
        )
      })}

      <div className="mx-0.5 h-4 w-px shrink-0 bg-(--line)/60" aria-hidden="true" />

      {SECONDARY_ACTIONS.map((action) => {
        const Icon = action.icon

        return (
          <button
            key={action.key}
            type="button"
            onClick={() => handlers[action.run](text)}
            className="flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
          >
            <Icon size={14} aria-hidden="true" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}