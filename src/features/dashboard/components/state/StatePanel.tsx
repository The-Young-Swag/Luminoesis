
import {
  secondPersonPeakWindow,
} from '#/features/dashboard/domain/engagement-copy'
import { PanelHeader } from '#/features/dashboard/components/layout/PanelHeader'
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
  const peakCue =
    peakLearningHour === null
      ? 'More timing observations are needed.'
      : secondPersonPeakWindow(peakLearningHour)

  return (
    <div className="card-flat flex h-full flex-col p-4 sm:p-5 md:p-6">
      <PanelHeader
        title="Your current state"
        description={
          learningState.state === 'Insufficient Signal'
            ? 'Standard spaced repetition is guiding your reviews for now.'
            : 'Your personal learning baseline is active and shaping what you see.'
        }
      />

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
            {learningState.reason}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-(--line) pt-5 sm:mt-auto">
        <p className="eyebrow">Your sharpest window</p>

        <p className="display mt-1 text-lg tabular-nums sm:text-xl">
          {peakLearningHour === null
            ? 'Still learning'
            : formatHour(peakLearningHour)}
        </p>

        <p className="mt-1 max-w-sm text-xs leading-5 text-(--ink-soft)">
          {peakCue}
        </p>
      </div>
    </div>
  )
}