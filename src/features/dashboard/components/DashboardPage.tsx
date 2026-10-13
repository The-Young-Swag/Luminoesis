import { useEffect, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { useBaseline } from '#/features/learning-state/hooks/useBaseline'
import { trackCalibrationAttempt, trackCalibrationCompletion } from '#/features/dashboard/domain/metrics'

import { useDashboardAnalytics } from '#/features/dashboard/hooks/useDashboardAnalytics'
import { useDashboardData } from '#/features/dashboard/hooks/useDashboardData'

import { PageHeader } from '#/shared/components/ui/PageHeader'
import { Reveal } from '#/shared/components/ui/Reveal'
import { StatCard } from '#/features/dashboard/components/snapshot/StatCard'
import { AdaptiveOptInBanner } from '#/features/dashboard/components/hero/AdaptiveOptInBanner'
import { DashboardHero } from '#/features/dashboard/components/hero/DashboardHero'
import { InsightBanner } from '#/features/dashboard/components/layout/InsightBanner'
import { DashboardSkeleton } from '#/features/dashboard/components/loading/DashboardSkeleton'
import { ActivityCard } from '#/features/dashboard/components/activity/ActivityCard'
import { RetentionPanel } from '#/features/dashboard/components/retention/RetentionPanel'
import { RhythmCard } from '#/features/dashboard/components/rhythm/RhythmCard'

import { UpcomingDue } from '#/features/dashboard/components/activity/UpcomingDue'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function dashboardDate(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function DashboardPage() {
  const { cards, sessions, signals, concepts, reviewEvents, ready, optIn, setOptIn } = useDashboardData()
  const { baseline, hasBaseline } = useBaseline()

  const {
    rhythmChartData,
    peakLearningHour,
    pattern,
    sessionCount,
    recentActivity,
    retentionChartData,
    studyMinutesThisWeek,
    studyMinutesDelta,
    recentReviewCount,
    learningState,
    isCalibrating,
    recallValue,
    recallDelta,
    weekMinutes,
    heatmap,
    calibrationProgress,
  } = useDashboardAnalytics({ cards, sessions, signals, baseline, hasBaseline, concepts, reviewEvents })

  const queue = useMemo(() => {
    const today = todayKey()
    const byDue = [...cards].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const dueCount = byDue.filter((card) => card.dueDate <= today).length
    return {
      overdue: byDue.filter((card) => card.dueDate < today).slice(0, 3),
      today: byDue.filter((card) => card.dueDate === today).slice(0, 2),
      upcoming: byDue.filter((card) => card.dueDate > today).slice(0, 2),
      dueCount,
    }
  }, [cards])

  useEffect(() => {
    if (isCalibrating) {
      void trackCalibrationAttempt()
    } else {
      void trackCalibrationCompletion()
    }
  }, [isCalibrating])

  if (!ready) {
    return <DashboardSkeleton />
  }

  if (cards.length === 0 && sessionCount === 0) {
    return (
      <div className="page-wrap space-y-5 py-6 md:py-8">
        <PageHeader title="Today" context={dashboardDate()} />

        <DashboardHero
          learningState={learningState}
          sessionCount={sessionCount}
          dueTodayCount={0}
          totalCards={0}
          calibrationProgress={calibrationProgress}
          isCalibrating={isCalibrating}
        />

        <section aria-labelledby="onboarding-heading" className="card-flat p-6 md:p-8">
          <h2 id="onboarding-heading" className="display text-2xl tracking-tight">
            Complete 5 sessions to unlock your rhythm
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-(--ink-soft)">
            Luminoesis learns when you are sharpest by watching typing timing —
            never what you type. Everything stays on this device.
          </p>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { step: '1', title: 'Add cards', detail: 'Capture ideas in the library' },
              { step: '2', title: 'Review daily', detail: 'Short sessions beat long ones' },
              { step: '3', title: 'Watch rhythm', detail: 'Your peak window appears here' },
            ].map((item) => (
              <li key={item.step} className="rounded-2xl bg-(--surface-muted) p-4">
                <span className="font-mono text-xs font-semibold tabular-nums text-(--accent)">
                  {item.step}
                </span>
                <p className="mt-1 text-sm font-semibold text-(--ink)">{item.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-(--ink-soft)">{item.detail}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/library" className="btn-primary inline-flex items-center justify-center gap-2 no-underline">
              Add your first cards
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <span className="font-mono text-xs tabular-nums text-(--ink-soft)">
              {sessionCount} of 5 sessions
            </span>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-wrap space-y-4 py-6 md:py-8">
      <PageHeader title="Today" context={dashboardDate()} />

      {optIn === null && (
        <AdaptiveOptInBanner onEnable={() => void setOptIn(true)} onDismiss={() => void setOptIn(false)} />
      )}

      <section
        aria-label="Study overview"
        className="grid grid-cols-12 items-stretch gap-4"
      >
        <Reveal className="col-span-12 lg:col-span-7 lg:row-span-2" delay={0}>
          <DashboardHero
            learningState={learningState}
            sessionCount={sessionCount}
            dueTodayCount={queue.dueCount}
            totalCards={cards.length}
            calibrationProgress={calibrationProgress}
            isCalibrating={isCalibrating}
          />
        </Reveal>

        <Reveal className="col-span-12 sm:col-span-6 lg:col-span-5" delay={60}>
          <StatCard
            label="Study time"
            value={`${studyMinutesThisWeek}m`}
            hint="Last 7 days"
            delta={studyMinutesDelta}
            spark={weekMinutes}
            sparkDays
          />
        </Reveal>

        <Reveal className="col-span-12 sm:col-span-6 lg:col-span-5" delay={120}>
          <StatCard
            label="Recall"
            value={recallValue}
            hint="Cards rated Good or Easy"
            delta={recallDelta}
            to="/insights"
          />
        </Reveal>

        <Reveal className="col-span-12 lg:col-span-7 lg:row-span-2" delay={120}>
          <UpcomingDue groups={queue} reviewedThisWeek={recentReviewCount} />
        </Reveal>

        <Reveal className="col-span-12 sm:col-span-6 lg:col-span-5" delay={180}>
          <RhythmCard
            hasBaseline={hasBaseline}
            rhythmChartData={rhythmChartData}
            sessionCount={sessionCount}
            peakLearningHour={peakLearningHour}
            recentSignalCount={signals.length}
          />
        </Reveal>

        <Reveal className="col-span-12 sm:col-span-6 lg:col-span-5" delay={240}>
          <ActivityCard items={recentActivity} heatmap={heatmap} />
        </Reveal>
      </section>

      {pattern && <InsightBanner text={pattern.text} stat={pattern.stat} />}

      <RetentionPanel data={retentionChartData} />
    </div>
  )
}
