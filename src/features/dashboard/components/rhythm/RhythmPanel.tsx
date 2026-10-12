
import { PanelHeader } from '#/features/dashboard/components/layout/PanelHeader'
import { LearningRhythmChart } from '#/features/dashboard/components/rhythm/LearningRhythmChart'

import { RhythmEmptyState } from './RhythmEmptyState'

type RhythmPanelProps = {
  hasBaseline: boolean
  rhythmChartData: Array<{
    id: string
    label: string
    deviation: number
  }>
  signalCount: number
  recentSignalCount: number
}

export function RhythmPanel({
  hasBaseline,
  rhythmChartData,
  signalCount,
  recentSignalCount,
}: RhythmPanelProps) {
  return (
    <div className="card-flat h-full p-4 sm:p-5 md:p-6">
      <PanelHeader
        title="Learning rhythm"
        description="How far your typing rhythm is drifting from your personal baseline right now"
        action={
          <span className="chip chip-live w-fit shrink-0">
            <span className="pulse-dot" aria-hidden="true" />
            Personal signal
          </span>
        }
      />

      <div className="min-w-0">
        {hasBaseline ? (
          <LearningRhythmChart
            data={rhythmChartData}
          />
        ) : (
          <RhythmEmptyState
            hasBaseline={false}
            signalCount={signalCount}
          />
        )}
      </div>

      {hasBaseline && (
        <>
          <p className="mt-3 text-[11px] leading-5 text-(--ink-soft)">
            The vertical scale counts how far each reading drifts from your
            personal baseline, in steps of your normal day-to-day variation.
          </p>

          <div className="mt-2 flex flex-col gap-1 font-mono text-[10px] tabular-nums text-(--ink-soft) sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span>Closer to baseline</span>
            <span>{recentSignalCount} observations</span>
          </div>
        </>
      )}
    </div>
  )
}