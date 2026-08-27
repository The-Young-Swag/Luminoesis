import { useMemo, useState } from 'react'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import { useBrainTrainer } from '#/features/brain-trainer/hooks/useBrainTrainer'
import { BrainTrainerOverlay } from '#/features/brain-trainer/components/BrainTrainerOverlay'

type BrainTrainerSectionProps = {
  concepts: Concept[]
}

type Phase = 'idle' | 'running' | 'done'

export function BrainTrainerSection({ concepts }: BrainTrainerSectionProps) {
  const conceptIds = useMemo(
    () => concepts.map((concept) => concept.id),
    [concepts],
  )
  const { items } = useBrainTrainer(conceptIds)

  const [phase, setPhase] = useState<Phase>('idle')
  const [summary, setSummary] = useState<{ answered: number; strong: number }>({
    answered: 0,
    strong: 0,
  })

  function start() {
    setPhase('running')
  }

  function complete(result: { answered: number; strong: number }) {
    setSummary(result)
    setPhase('done')
  }

  function reset() {
    setPhase('idle')
  }

  return (
    <section className="card-flat mt-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-(--ink)">Brain Trainer</h2>
          <p className="mt-1 text-sm text-(--ink-soft)">
            A mixed recall drill of due flashcards and quiz questions across this
            space.
          </p>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={items.length === 0}
          className="btn-primary px-4 py-2"
        >
          Start drill
        </button>
      </div>

      {phase === 'done' ? (
        <p className="mt-4 text-sm text-(--ink-soft)">
          Drill complete — {summary.strong}/{summary.answered} answered with
          confidence. Reinforcing {conceptIds.length} concept
          {conceptIds.length === 1 ? '' : 's'}.
        </p>
      ) : null}

      {phase === 'running' ? (
        <BrainTrainerOverlay
          items={items}
          onCancel={reset}
          onComplete={complete}
        />
      ) : null}
    </section>
  )
}
