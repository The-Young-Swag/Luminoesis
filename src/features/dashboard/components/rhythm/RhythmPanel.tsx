import { Activity } from 'lucide-react'

import { CornerBrackets } from '#/features/dashboard/components/layout/CornerBrackets'
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
    <div className="card-flat relative overflow-hidden p-4 sm:p-5 md:p-6">
      <CornerBrackets />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--veridian-muted) text-(--veridian)">
              <Activity size={14} />
            </span>

            <h2 className="text-sm font-semibold">
              Learning rhythm
            </h2>
          </div>

          <p className="mt-1 max-w-xl text-xs leading-5 text-(--ink-faint)">
            Recent timing deviation from your personal baseline
          </p>
        </div>

        <span className="chip chip-live w-fit shrink-0">
          <span
            className="pulse-dot"
            aria-hidden="true"
          />
          Personal signal
        </span>
      </div>

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

      <div className="mt-3 flex flex-col gap-1 font-mono text-[10px] text-(--ink-faint) sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span>Closer to baseline</span>
        <span>
          {recentSignalCount} observations
        </span>
      </div>
    </div>
  )
}