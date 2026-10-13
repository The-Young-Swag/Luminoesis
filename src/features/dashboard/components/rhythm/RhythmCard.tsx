import { PanelHeader } from '#/features/dashboard/components/layout/PanelHeader'
import { LearningRhythmChart } from '#/features/dashboard/components/rhythm/LearningRhythmChart'
import { secondPersonPeakWindow } from '#/features/dashboard/domain/engagement-copy'

type RhythmCardProps = {
  hasBaseline: boolean
  rhythmChartData: Array<{
    id: string
    label: string
    deviation: number
  }>
  sessionCount: number
  calibrationTotal?: number
  peakLearningHour: number | null
  recentSignalCount: number
}

/*
 * Single rhythm module for the dashboard (mockup v5 "Your rhythm").
 * Merges the old RhythmPanel (chart) + StatePanel (state + peak window)
 * so "not enough signal" is said once, in one card, with one header.
 * Calibrating → session progress + meter. Baseline → chart + peak line.
 */
export function RhythmCard({
  hasBaseline,
  rhythmChartData,
  sessionCount,
  calibrationTotal = 5,
  peakLearningHour,
  recentSignalCount,
}: RhythmCardProps) {
  const done = Math.min(Math.max(0, sessionCount), calibrationTotal)
  const pct = Math.round((done / calibrationTotal) * 100)

  if (!hasBaseline) {
    return (
      <div className="card-flat flex h-full flex-col p-5 md:p-6">
        <PanelHeader
          title="Your rhythm"
          description="Standard scheduling until you reach 5 sessions"
        />

        <div className="mt-4 flex items-baseline justify-between gap-3">
          <span className="display text-4xl tabular-nums">
            {done} of {calibrationTotal}
          </span>
          <span className="shrink-0 text-[13px] text-(--ink-soft)">sessions to unlock</span>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-(--surface-muted)"
          role="img"
          aria-label={`${done} of ${calibrationTotal} sessions`}
        >
          <div
            className="h-full rounded-full bg-(--accent)"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="mt-4 text-[13.5px] leading-6 text-(--ink-soft)">
          Your sharpest study window shows up here once Luminoesis has seen a
          few sessions. It reads typing timing only, never what you type.
        </p>
      </div>
    )
  }

  const peakCue =
    peakLearningHour === null
      ? 'More timing observations are needed.'
      : secondPersonPeakWindow(peakLearningHour)

  return (
    <div className="card-flat flex h-full flex-col p-5 md:p-6">
      <PanelHeader
        title="Your rhythm"
        description="How your recent timing compares with your baseline"
      />

      <div className="mt-4 min-w-0">
        <LearningRhythmChart data={rhythmChartData} />
      </div>

      <p className="mt-4 text-[13.5px] leading-6 text-(--ink-soft)">{peakCue}</p>

      <p className="mt-2 font-mono text-[11px] tabular-nums text-(--ink-soft)">
        {recentSignalCount} observations
      </p>
    </div>
  )
}
