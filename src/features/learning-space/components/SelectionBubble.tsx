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

const ACTIONS = [
  {
    key: 'ask',
    label: 'Ask Tutor',
    icon: MessageCircle,
    run: 'onAskTutor',
  },
  {
    key: 'highlight',
    label: 'Highlight',
    icon: Highlighter,
    run: 'onCreateHighlight',
  },
  {
    key: 'concept',
    label: 'Concept',
    icon: Lightbulb,
    run: 'onCreateConcept',
  },
  {
    key: 'flashcard',
    label: 'Flashcard',
    icon: NotebookPen,
    run: 'onCreateFlashcard',
  },
  {
    key: 'quiz',
    label: 'Quiz',
    icon: HelpCircle,
    run: 'onCreateQuiz',
  },
] as const

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

  const above = rect.top > 64
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, 130),
    (typeof window !== 'undefined' ? window.innerWidth : 1024) - 130,
  )

  const style: React.CSSProperties = {
    position: 'fixed',
    top: above ? rect.top : rect.bottom,
    left,
    transform: above
      ? 'translate(-50%, calc(-100% - 8px))'
      : 'translate(-50%, 8px)',
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
      className="flex items-center gap-0.5 rounded-full border border-(--line) bg-(--surface) p-1 shadow-2xl"
      style={style}
      onMouseDown={(event) => event.preventDefault()}
    >
      {ACTIONS.map((action) => {
        const Icon = action.icon

        return (
          <button
            key={action.key}
            type="button"
            onClick={() => handlers[action.run](text)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
          >
            <Icon size={14} aria-hidden="true" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
