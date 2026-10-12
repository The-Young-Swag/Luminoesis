import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Zap } from 'lucide-react'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import { useBrainTrainer } from '#/features/brain-trainer/hooks/useBrainTrainer'
import { BrainTrainerOverlay } from '#/features/brain-trainer/components/BrainTrainerOverlay'
import { SectionHeader } from '#/shared/components/ui/SectionHeader'
import { EmptyState } from '#/shared/components/ui/EmptyState'

type BrainTrainerSectionProps = {
  concepts: Concept[]
}

type Phase = 'idle' | 'running' | 'done'

export function BrainTrainerSection({ concepts }: BrainTrainerSectionProps) {
  const conceptIds = useMemo(() => concepts.map((concept) => concept.id), [concepts])
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
    <section id="brain-trainer" className="scroll-mt-24">
      <SectionHeader
        icon={Zap}
        title="Brain Trainer"
        description="A mixed recall drill of due flashcards and quiz questions across this space."
        action={
          <button
            type="button"
            onClick={start}
            disabled={items.length === 0}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start drill
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Nothing to drill yet"
          description="Once you have due flashcards or quiz questions, they’ll show up here as a mixed recall drill."
          action={
            <Link to="/library" className="btn-primary">
              Add study cards
            </Link>
          }
        />
      ) : phase === 'done' ? (
        <div className="card-flat p-6">
          <p className="text-sm leading-6 text-(--ink-soft)">
            Drill complete —{' '}
            <span className="font-medium text-(--ink)">
              {summary.strong}/{summary.answered}
            </span>{' '}
            answered with confidence. Reinforcing {conceptIds.length} concept
            {conceptIds.length === 1 ? '' : 's'}.
          </p>
        </div>
      ) : (
        <div className="card-flat p-6">
          <p className="text-sm leading-6 text-(--ink-soft)">
            {items.length} item{items.length === 1 ? '' : 's'} ready for a quick recall pass.
          </p>
        </div>
      )}

      {phase === 'running' ? (
        <BrainTrainerOverlay items={items} onCancel={reset} onComplete={complete} />
      ) : null}
    </section>
  )
}