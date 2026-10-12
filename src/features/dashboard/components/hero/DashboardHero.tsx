import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

import { headlineForState } from '#/features/dashboard/components/lib/dashboardFormatters'
import { AnimatedNumber } from '#/shared/components/ui/AnimatedNumber'

type DashboardHeroProps = {
  learningState: { state: string; reason: string }
  sessionCount: number
  dueTodayCount: number
  totalCards: number
  calibrationProgress: number
  calibrationTotal?: number
  isCalibrating: boolean
}

const CALIBRATION_STEPS = 5

export function DashboardHero({
  learningState,
  sessionCount,
  dueTodayCount,
  totalCards,
  calibrationProgress,
  calibrationTotal = CALIBRATION_STEPS,
  isCalibrating,
}: DashboardHeroProps) {
  const isEmpty = totalCards === 0

  return (
    <section
      aria-labelledby="dashboard-headline"
      className="hero-card relative flex h-full min-h-90 flex-col justify-between gap-7 overflow-hidden rounded-[32px] p-6 md:p-9"
    >
      <div>
        {isEmpty ? (
          <>
            <h1
              id="dashboard-headline"
              className="display max-w-[20ch] text-balance text-4xl tracking-tight md:text-5xl"
            >
              {headlineForState(
                learningState.state,
                dueTodayCount,
                totalCards,
              )}
            </h1>
            <p className="mt-3.5 max-w-[46ch] text-base leading-6 opacity-80">
              Add study cards to your library and Luminoesis will schedule
              focused reviews around your rhythm.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3.5">
              <b
                id="dashboard-headline"
                className="display text-[clamp(4.5rem,9vw,7rem)] font-bold leading-none tracking-[-0.04em] tabular-nums"
              >
                <AnimatedNumber value={dueTodayCount} />
              </b>
              <span className="display text-[22px] font-semibold">
                {dueTodayCount === 1 ? 'card ready to review' : 'cards ready to review'}
              </span>
            </div>
            <p className="mt-3.5 max-w-[46ch] text-base leading-6 opacity-80">
              {learningState.reason}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3.5">
        {isEmpty ? (
          <Link to="/library" className="island no-underline">
            Add your first cards
            <span aria-hidden="true" className="island-arrow">
              <ArrowUpRight size={18} />
            </span>
          </Link>
        ) : (
          <>
            <Link to="/review" className="island no-underline">
              Start review
              <span aria-hidden="true" className="island-arrow">
                <ArrowUpRight size={18} />
              </span>
            </Link>
            <Link to="/library" className="ghost-btn no-underline">
              Browse library
            </Link>
          </>
        )}

        {isCalibrating && !isEmpty && (
          <CalibrationSteps
            progress={calibrationProgress}
            total={calibrationTotal}
            sessionCount={sessionCount}
          />
        )}
      </div>
    </section>
  )
}

function CalibrationSteps({
  progress,
  total,
  sessionCount,
}: {
  progress: number
  total: number
  sessionCount: number
}) {
  const done = Math.min(Math.max(0, Math.round(progress)), total)

  return (
    <div
      className="flex items-center gap-1.5 text-[13px] opacity-80"
      role="img"
      aria-label={`Calibrating: session ${Math.min(sessionCount + 1, total)} of ${total}`}
    >
      {Array.from({ length: total }).map((_, index) => (
        <i
          key={index}
          aria-hidden="true"
          className={`h-[5px] w-[26px] rounded-full ${index < done ? 'bg-(--gold-hero)' : 'bg-current opacity-25'}`}
        />
      ))}
      <span className="ml-1">Calibrating</span>
    </div>
  )
}
