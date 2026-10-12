import { useEffect } from 'react'

import { useBaseline } from '#/features/learning-state/hooks/useBaseline'
import { trackCalibrationAttempt, trackCalibrationCompletion } from '#/features/dashboard/domain/metrics'

import { useDashboardAnalytics } from '#/features/dashboard/hooks/useDashboardAnalytics'
import { useDashboardData } from '#/features/dashboard/hooks/useDashboardData'

import { AdaptiveOptInBanner } from '#/features/dashboard/components/hero/AdaptiveOptInBanner'
import { DashboardHero } from '#/features/dashboard/components/hero/DashboardHero'
import { InsightBanner } from '#/features/dashboard/components/layout/InsightBanner'
import { CalibrationProgress } from '#/features/dashboard/components/loading/CalibrationProgress'
import { DashboardSkeleton } from '#/features/dashboard/components/loading/DashboardSkeleton'
import { RetentionPanel } from '#/features/dashboard/components/retention/RetentionPanel'
import { RhythmPanel } from '#/features/dashboard/components/rhythm/RhythmPanel'
import { SnapshotStats } from '#/features/dashboard/components/snapshot/SnapshotStats'
import { StatePanel } from '#/features/dashboard/components/state/StatePanel'

import { RecentActivity } from '#/features/dashboard/components/activity/RecentActivity'
import { UpcomingDue } from '#/features/dashboard/components/activity/UpcomingDue'

export function DashboardPage() {
  const { cards, sessions, signals, concepts, reviewEvents, ready, optIn, setOptIn } = useDashboardData()
  const { baseline, hasBaseline } = useBaseline()

  const {
    recentSignals,
    rhythmChartData,
    peakLearningHour,
    dueToday,
    newCards,
    pattern,
    sessionCount,
    recentActivity,
    retentionChartData,
    studyMinutesThisWeek,
    recentReviewCount,
    learningState,
    isCalibrating,
    recallValue,
    recallHint,
    calibrationProgress,
  } = useDashboardAnalytics({ cards, sessions, signals, baseline, hasBaseline, concepts, reviewEvents })

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

  return (
    <div className="page-wrap space-y-5 py-6 md:py-8">
      {optIn === null && (
        <AdaptiveOptInBanner onEnable={() => void setOptIn(true)} onDismiss={() => void setOptIn(false)} />
      )}

      <DashboardHero learningState={learningState} sessionCount={sessionCount} dueTodayCount={dueToday.length} />

      {isCalibrating && (
        <div aria-live="polite">
          <CalibrationProgress progress={calibrationProgress} />
        </div>
      )}

      <SnapshotStats
        studyMinutesThisWeek={studyMinutesThisWeek}
        recentReviewCount={recentReviewCount}
        recallValue={recallValue}
        recallHint={recallHint}
        dueTodayCount={dueToday.length}
      />

      {/* Command deck — main feed (chart, insight, activity) alongside a
          HUD rail (current state, review queue). Mirrors a game launcher's
          center-feed + side-panel split more than a flat stack of cards. */}
      <section
        aria-label="Study command deck"
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]"
      >
        <div className="space-y-4">
          <RhythmPanel
            hasBaseline={hasBaseline}
            rhythmChartData={rhythmChartData}
            signalCount={signals.length}
            recentSignalCount={recentSignals.length}
          />

          {pattern && <InsightBanner text={pattern.text} stat={pattern.stat} />}

          <RecentActivity items={recentActivity} />
        </div>

        <div className="space-y-4">
          <StatePanel learningState={learningState} peakLearningHour={peakLearningHour} />
          <UpcomingDue dueToday={dueToday} newCount={newCards.length} />
        </div>
      </section>

      <RetentionPanel data={retentionChartData} />

      <p className="px-1 text-center font-mono text-[10px] leading-5 text-(--ink-faint)">
        <span translate="no">Luminoesis</span> never records what you type — only timing deltas. Your baseline stays on
        this device. Suggestions are optional — you decide.
      </p>
    </div>
  )
}
