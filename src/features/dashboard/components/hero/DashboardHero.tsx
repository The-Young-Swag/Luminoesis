import { Link } from '@tanstack/react-router'
import { ArrowUpRight, GraduationCap, Library } from 'lucide-react'

import { headlineForState } from '#/features/dashboard/components/lib/dashboardFormatters'

type DashboardHeroProps = {
  learningState: { state: string; reason: string }
  sessionCount: number
  dueTodayCount: number
  totalCards: number
  calibrationProgress: number
  calibrationTotal?: number
  isCalibrating: boolean
}

export function DashboardHero({
  learningState,
  sessionCount,
  dueTodayCount,
  totalCards,
  calibrationProgress,
  calibrationTotal = 5,
  isCalibrating,
}: DashboardHeroProps) {
  const isEmpty = totalCards === 0

  return (
    <section
      aria-labelledby="dashboard-headline"
      className="relative overflow-hidden rounded-3xl bg-[#004225] p-6 text-[#f2f7f3] md:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: '#50c878' }}
      />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfe3d6]">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[#50c878]"
            />
            {isCalibrating
              ? `Calibrating · session ${Math.min(sessionCount + 1, calibrationTotal)} of ${calibrationTotal}`
              : learningState.state}
          </p>

          <h1
            id="dashboard-headline"
            className="display mt-4 max-w-[20ch] text-balance text-3xl tracking-tight text-white md:text-[2.75rem] md:leading-[1.05]"
          >
            {headlineForState(
              learningState.state,
              dueTodayCount,
              totalCards,
            )}
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#cfe3d6]">
            {isEmpty
              ? 'Add study cards to your library and Luminoesis will schedule focused reviews around your rhythm.'
              : learningState.reason}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            {isEmpty ? (
              <Link
                to="/library"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#f2f7f3] px-5 py-2.5 text-sm font-semibold text-[#004225] no-underline transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Library size={16} aria-hidden="true" />
                Add your first cards
                <ArrowUpRight
                  size={15}
                  aria-hidden="true"
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            ) : (
              <Link
                to="/review"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#f2f7f3] px-5 py-2.5 text-sm font-semibold text-[#004225] no-underline transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <GraduationCap size={16} aria-hidden="true" />
                Start focused review
                <ArrowUpRight
                  size={15}
                  aria-hidden="true"
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            )}

            {!isEmpty && (
              <Link
                to="/library"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-[#f2f7f3] no-underline transition-colors hover:border-white/50 hover:bg-white/10"
              >
                Browse library
              </Link>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-6 lg:flex-col lg:items-end lg:gap-4">
          {isCalibrating ? (
            <CalibrationRing
              progress={calibrationProgress}
              total={calibrationTotal}
            />
          ) : (
            <div className="text-left lg:text-right">
              <div className="display text-6xl tabular-nums text-white">
                {dueTodayCount}
              </div>
              <div className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfe3d6]">
                Due today
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function CalibrationRing({
  progress,
  total,
}: {
  progress: number
  total: number
}) {
  const size = 96
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = Math.min(1, Math.max(0, progress / total))
  const offset = circumference * (1 - fraction)

  return (
    <div
      role="img"
      aria-label={`Calibration ${progress} of ${total} sessions complete`}
      className="flex items-center gap-4"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#50c878"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div>
        <div className="display text-2xl tabular-nums text-white">
          {progress}/{total}
        </div>
        <div className="mt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfe3d6]">
          Sessions
        </div>
      </div>
    </div>
  )
}
