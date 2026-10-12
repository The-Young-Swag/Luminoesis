import { useEffect, useState } from 'react'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import { Dialog } from '#/shared/components/ui/Dialog'

type QuizSetupDialogProps = {
  concepts: Concept[]
  notice?: string | null
  open: boolean
  onStart: (config: { conceptIds: string[]; limit: number }) => void
  onClose: () => void
}

const LIMITS = [5, 10, 15, 20]

export function QuizSetupDialog({
  concepts,
  notice,
  open,
  onStart,
  onClose,
}: QuizSetupDialogProps) {
  const [selected, setSelected] = useState<string[]>(
    concepts.map((concept) => concept.id),
  )
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const toggle = (id: string) => {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    )
  }

  const canStart = selected.length > 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="quiz-setup-title"
      label="Start a quiz"
    >
      <div className="max-h-[80vh] w-full overflow-auto p-6">
        <div className="flex items-start justify-between">
          <h2 id="quiz-setup-title" className="text-lg font-semibold text-(--ink)">Start a quiz</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quiz setup"
            className="btn-ghost px-3 py-1 text-sm"
          >
            Cancel
          </button>
        </div>

        <p className="mt-2 text-sm text-(--ink-soft)">
          Pick the concepts to practice. Questions are drawn from the question
          bank tied to each concept.
        </p>

        {notice ? (
          <p role="alert" className="mt-3 rounded-xl border border-(--warning)/30 bg-(--warning-muted) px-3 py-2 text-sm text-(--warning-strong)">
            {notice}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Concepts to include">
          {concepts.map((concept) => {
            const active = selected.includes(concept.id)
            return (
              <button
                key={concept.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(concept.id)}
                className={`chip transition ${
                  active
                    ? 'bg-(--blue) text-white'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {concept.name}
              </button>
            )
          })}
        </div>

        <div className="mt-5">
          <span id="quiz-limit-label" className="kicker text-(--ink-soft)">Max questions</span>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-labelledby="quiz-limit-label">
            {LIMITS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={limit === value}
                onClick={() => setLimit(value)}
                className={`card-flat px-4 py-2 text-(--ink) transition ${
                  limit === value ? 'ring-2 ring-(--blue)' : ''
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onStart({ conceptIds: selected, limit })}
            disabled={!canStart}
            className="btn-primary px-5 py-2"
          >
            Begin quiz
          </button>
        </div>
      </div>
    </Dialog>
  )
}
