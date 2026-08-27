import { useState } from 'react'

import type { Concept } from '#/features/learning-space/domain/learningSpace'

type QuizSetupDialogProps = {
  concepts: Concept[]
  onStart: (config: { conceptIds: string[]; limit: number }) => void
  onClose: () => void
}

const LIMITS = [5, 10, 15, 20]

export function QuizSetupDialog({
  concepts,
  onStart,
  onClose,
}: QuizSetupDialogProps) {
  const [selected, setSelected] = useState<string[]>(
    concepts.map((concept) => concept.id),
  )
  const [limit, setLimit] = useState(10)

  const toggle = (id: string) => {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    )
  }

  const canStart = selected.length > 0

  return (
    <div className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="glass-surface glass-specular rise card-flat w-full max-w-lg p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-(--ink)">Start a quiz</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-3 py-1 text-sm"
          >
            Cancel
          </button>
        </div>

        <p className="mt-2 text-sm text-(--ink-soft)">
          Pick the concepts to practice. Questions are drawn from the question
          bank tied to each concept.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {concepts.map((concept) => {
            const active = selected.includes(concept.id)
            return (
              <button
                key={concept.id}
                type="button"
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
          <span className="kicker text-(--ink-faint)">Max questions</span>
          <div className="mt-2 flex gap-2">
            {LIMITS.map((value) => (
              <button
                key={value}
                type="button"
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
    </div>
  )
}
