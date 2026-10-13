import { useEffect, useRef } from 'react'
import {
  Brain,
  FilePlus2,
  Highlighter,
  MessageCircle,
  NotebookPen,
  X,
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

export function SelectionBubble({
  selection,
  onAskTutor,
  onCreateHighlight,
  onCreateConcept,
  onCreateFlashcard,
  onCreateQuiz,
  onDismiss,
}: SelectionBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target

      if (target instanceof Node && !bubbleRef.current?.contains(target)) {
        onDismiss()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [onDismiss])

  const bubbleWidth = 360
  const viewportPadding = 16

  const left = Math.min(
    Math.max(
      selection.rect.left + selection.rect.width / 2 - bubbleWidth / 2,
      viewportPadding,
    ),
    window.innerWidth - bubbleWidth - viewportPadding,
  )
  
  const top = Math.max(selection.rect.bottom + 12, viewportPadding)

  return (
    <div
      ref={bubbleRef}
      role="toolbar"
      aria-label="Selection actions"
      className="fixed z-50 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-xl bg-(--glass-bg-strong) p-1.5 shadow-lg backdrop-blur-xl"
      style={{
        top,
        left,
      }}
    >
      <SelectionAction
        label="Ask Sophia"
        icon={MessageCircle}
        onClick={() => onAskTutor(selection.text)}
      />

      <SelectionAction
        label="Highlight"
        icon={Highlighter}
        onClick={() => onCreateHighlight(selection.text)}
      />

      <SelectionAction
        label="Concept"
        icon={Brain}
        onClick={() => onCreateConcept(selection.text)}
      />

      <SelectionAction
        label="Flashcard"
        icon={NotebookPen}
        onClick={() => onCreateFlashcard(selection.text)}
      />

      <SelectionAction
        label="Quiz"
        icon={FilePlus2}
        onClick={() => onCreateQuiz(selection.text)}
      />

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss selection actions"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

type SelectionActionProps = {
  label: string
  icon: typeof MessageCircle
  onClick: () => void
}

function SelectionAction({
  label,
  icon: Icon,
  onClick,
}: SelectionActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  )
}