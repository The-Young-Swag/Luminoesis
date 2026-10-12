import { useRef, useState } from 'react'

import type { BrainTrainerItem } from '#/features/brain-trainer/domain/brainTrainer'
import { submitBrainTrainerAnswer } from '#/features/brain-trainer/application/brainTrainer'
import type { SubmitBrainTrainerAnswerInput } from '#/features/brain-trainer/application/brainTrainer'
import { GRADE_BUTTONS } from '#/shared/ui/gradeButtons'
import { Dialog } from '#/shared/components/ui/Dialog'

type BrainTrainerOverlayProps = {
  items: BrainTrainerItem[]
  onCancel: () => void
  onComplete: (summary: { answered: number; strong: number }) => void
}

export function BrainTrainerOverlay({
  items,
  onCancel,
  onComplete,
}: BrainTrainerOverlayProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const startedAtRef = useRef<number>(Date.now())
  const strongCountRef = useRef(0)

  const total = items.length
  const current = items[index]
  const finished = index >= total || total === 0

  async function handleGrade(grade: number) {
    if (busy || !current) return
    setBusy(true)
    if (grade >= 2) strongCountRef.current += 1
    const payload: SubmitBrainTrainerAnswerInput = {
      item: { id: current.id, conceptId: current.conceptId },
      grade,
      durationMs: Math.max(0, Date.now() - startedAtRef.current),
    }

    try {
      await submitBrainTrainerAnswer(payload)
    } catch {
      // surface nothing destructive; still advance the drill
    }

    const answered = index + 1
    if (answered >= total) {
      onComplete({ answered: total, strong: strongCountRef.current })
      return
    }

    setRevealed(false)
    setBusy(false)
    setIndex(answered)
  }

  if (finished) {
    return null
  }

  return (
    <Dialog
      open
      onClose={onCancel}
      label="Brain trainer"
    >
      <div className="max-h-[80vh] w-full overflow-auto p-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow">
            Brain Trainer · {index + 1} of {total}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost px-3 py-1 text-sm"
          >
            Exit
          </button>
        </div>

        <span className="chip mt-3 w-fit">
          {current.kind === 'flashcard' ? 'Flashcard' : 'Quiz question'}
        </span>

        <h2 className="mt-3 text-lg font-semibold text-(--ink)">
          {current.prompt}
        </h2>

        {revealed ? (
          <p className="mt-4 rounded-lg bg-(--surface-muted) p-3 text-(--ink-soft)">
            {current.answer}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="btn-primary px-5 py-2"
            >
              Reveal answer
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {GRADE_BUTTONS.map((button) => (
                <button
                  key={button.grade}
                  type="button"
                  onClick={() => handleGrade(button.grade)}
                  disabled={busy}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${button.className}`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
