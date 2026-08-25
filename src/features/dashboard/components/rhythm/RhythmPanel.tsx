import { Activity } from 'lucide-react'

import { CornerBrackets } from '#/features/dashboard/components/layout/CornerBrackets'
import { LearningRhythmChart } from '#/features/dashboard/components/rhythm/LearningRhythmChart'

import { RhythmEmptyState } from './RhythmEmptyState'

type RhythmPanelProps = {
  hasBaseline: boolean
  rhythmChartData: Array<{ id: string; label: string; deviation: number }>
  signalCount: number
  recentSignalCount: number
}

export function RhythmPanel({ hasBaseline, rhythmChartData, signalCount, recentSignalCount }: RhythmPanelProps) {
  return (
    <div className="card-flat relative overflow-hidden p-5 md:p-6">
      <CornerBrackets />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-(--veridian-muted) text-(--veridian)">
              <Activity size={14} />
            </span>
            <h2 className="text-sm font-semibold">Learning rhythm</h2>
          </div>

          <p className="mt-1 text-xs text-(--ink-faint)">Recent timing deviation from your personal baseline</p>
        </div>

        <span className="chip chip-live">
          <span className="pulse-dot" aria-hidden="true" />
          Personal signal
        </span>
      </div>

      {hasBaseline ? (
        <LearningRhythmChart data={rhythmChartData} />
      ) : (
        <RhythmEmptyState hasBaseline={false} signalCount={signalCount} />
      )}

      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-(--ink-faint)">
        <span>Closer to baseline</span>
        <span>{recentSignalCount} observations</span>
      </div>
    </div>
  )
}
