import { Flame } from 'lucide-react'

import { formatHour, stateDot } from '#/features/dashboard/components/lib/dashboardFormatters'

type StatePanelProps = {
  learningState: { state: string; reason: string }
  peakLearningHour: number | null
}

export function StatePanel({ learningState, peakLearningHour }: StatePanelProps) {
  return (
    <div className="card-flat flex flex-col p-5 md:p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-(--surface-muted)">
          <Flame size={14} />
        </span>
        <h2 className="text-sm font-semibold">Your current state</h2>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-(--surface-muted)">
          <span className={`h-3 w-3 rounded-full ${stateDot(learningState.state)}`} />
        </span>

        <div className="min-w-0">
          <div className="display text-2xl">{learningState.state}</div>

          <p className="mt-0.5 text-sm leading-6 text-(--ink-soft)">
            {learningState.state === 'Insufficient Signal'
              ? 'Standard SM-2 is currently guiding your reviews.'
              : 'Your personal learning baseline is active.'}
          </p>
        </div>
      </div>

      <div className="mt-auto border-t border-(--line) pt-5">
        <p className="mono-label">Best observed window</p>

        <p className="display mt-1 text-xl">
          {peakLearningHour === null ? 'Still learning' : formatHour(peakLearningHour)}
        </p>

        <p className="mt-1 text-xs leading-5 text-(--ink-faint)">
          {peakLearningHour === null
            ? 'More timing observations are needed.'
            : 'Lowest observed deviation from your baseline.'}
        </p>
      </div>
    </div>
  )
}
