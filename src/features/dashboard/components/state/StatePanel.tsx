import { Flame } from 'lucide-react'

import {
  formatHour,
  stateDot,
} from '#/features/dashboard/components/lib/dashboardFormatters'

type StatePanelProps = {
  learningState: {
    state: string
    reason: string
  }
  peakLearningHour: number | null
}

export function StatePanel({
  learningState,
  peakLearningHour,
}: StatePanelProps) {
  return (
    <div className="card-flat flex flex-col p-4 sm:p-5 md:p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--surface-muted)">
          <Flame size={14} />
        </span>

        <h2 className="text-sm font-semibold">
          Your current state
        </h2>
      </div>

      <div className="mt-5 flex min-w-0 items-center gap-3 sm:mt-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-(--surface-muted) sm:h-14 sm:w-14">
          <span
            className={`h-3 w-3 rounded-full ${stateDot(
              learningState.state,
            )}`}
          />
        </span>

        <div className="min-w-0">
          <div className="display wrap-break-word text-xl sm:text-2xl">
            {learningState.state}
          </div>

          <p className="mt-0.5 text-sm leading-6 text-(--ink-soft)">
            {learningState.state ===
            'Insufficient Signal'
              ? 'Standard SM-2 is currently guiding your reviews.'
              : 'Your personal learning baseline is active.'}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-(--line) pt-5 sm:mt-auto">
        <p className="mono-label">
          Best observed window
        </p>

        <p className="display mt-1 text-lg sm:text-xl">
          {peakLearningHour === null
            ? 'Still learning'
            : formatHour(peakLearningHour)}
        </p>

        <p className="mt-1 max-w-sm text-xs leading-5 text-(--ink-faint)">
          {peakLearningHour === null
            ? 'More timing observations are needed.'
            : 'Lowest observed deviation from your baseline.'}
        </p>
      </div>
    </div>
  )
}