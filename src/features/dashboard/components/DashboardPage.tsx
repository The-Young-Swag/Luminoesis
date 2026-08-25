import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Flame,
  GraduationCap,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

import { useBaseline } from '#/shared/hooks/useBaseline'
import { gainFrameDue, ownershipCue } from '#/shared/lib/engagement-copy'
import { trackCalibrationAttempt, trackCalibrationCompletion } from '#/shared/lib/metrics'

import { useDashboardAnalytics } from '#/features/dashboard/hooks/useDashboardAnalytics'
import { useDashboardData } from '#/features/dashboard/hooks/useDashboardData'

import { LearningRhythmChart } from '#/features/dashboard/components/LearningRhythmChart'
import { RecentActivity } from '#/features/dashboard/components/RecentActivity'
import { RetentionBars } from '#/features/dashboard/components/RetentionBars'
import { StatCard } from '#/features/dashboard/components/StatCard'
import { UpcomingDue } from '#/features/dashboard/components/UpcomingDue'

const CALIBRATION_TARGET = 5
const SKELETON_STAT_COUNT = 4

export function DashboardPage() {
  const { cards, sessions, signals, ready, optIn, setOptIn } = useDashboardData()
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
  } = useDashboardAnalytics({ cards, sessions, signals, baseline, hasBaseline })

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

      {isCalibrating && <CalibrationProgress progress={calibrationProgress} />}

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
      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
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
        Luminoesis never records what you type — only timing deltas. Your baseline stays on this device.
        Suggestions are optional — you decide.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

type DashboardHeroProps = {
  learningState: { state: string; reason: string }
  sessionCount: number
  dueTodayCount: number
}

function DashboardHero({ learningState, sessionCount, dueTodayCount }: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-(--line) bg-(--surface-raised) p-5 md:p-8">
      <CornerBrackets />
      <HeroGlow />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--surface-muted) py-1 pl-1.5 pr-3">
            <span className={`h-2.5 w-2.5 rounded-full ${stateDot(learningState.state)}`} />
            <span className="mono-label">{learningState.state}</span>
          </div>

          <p className="mt-2 font-mono text-xs text-(--ink-faint)">— {ownershipCue(sessionCount)}</p>

          <h1 className="display mt-3 text-3xl tracking-tight md:text-4xl">
            {headlineForState(learningState.state, dueTodayCount)}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-(--ink-soft)">{learningState.reason}</p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row lg:flex-col lg:items-end">
          <Link
            to="/review"
            className="btn-primary group inline-flex items-center justify-center gap-2 no-underline transition-shadow hover:shadow-[0_0_24px_-4px_var(--veridian)]"
          >
            <GraduationCap size={16} />
            Start focused review
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>

          <span className="text-center font-mono text-[11px] text-(--ink-faint) lg:text-right">
            {gainFrameDue(dueTodayCount)}
          </span>
        </div>
      </div>
    </section>
  )
}

function HeroGlow() {
  return (
    <>
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--veridian), transparent 65%)' }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--blue), transparent 70%)' }}
        aria-hidden="true"
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Opt-in banner
// ---------------------------------------------------------------------------

type AdaptiveOptInBannerProps = {
  onEnable: () => void
  onDismiss: () => void
}

function AdaptiveOptInBanner({ onEnable, onDismiss }: AdaptiveOptInBannerProps) {
  return (
    <section className="card-flat flex flex-col gap-4 border-(--veridian)/20 p-5 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <div className="mono-label">Adaptive learning</div>

        <h3 className="mt-1 text-[15px] font-medium">Allow Luminoesis to notice rhythm and suggest?</h3>

        <p className="mt-1 text-sm leading-relaxed text-(--ink-soft)">
          You stay in control. Suggestions are optional, timing-only, on-device, and never based on key content.
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn-primary" onClick={onEnable}>
          Enable
        </button>

        <button type="button" className="btn-ghost" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Calibration progress (XP-style)
// ---------------------------------------------------------------------------

function CalibrationProgress({ progress }: { progress: number }) {
  const percentComplete = (progress / CALIBRATION_TARGET) * 100

  return (
    <section className="rounded-2xl border border-(--veridian)/20 bg-(--veridian-muted) p-4">
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-(--veridian) font-mono text-xs text-white shadow-[0_0_20px_-4px_var(--veridian)]">
          {progress}/{CALIBRATION_TARGET}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">Learning your rhythm</p>
            <span className="chip chip-live">{progress} / {CALIBRATION_TARGET}</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--surface-muted)">
            <div
              className="h-full rounded-full bg-linear-to-r from-(--veridian) to-(--blue) transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Snapshot stats
// ---------------------------------------------------------------------------

type SnapshotStatsProps = {
  studyMinutesThisWeek: number
  recentReviewCount: number
  recallValue: string
  recallHint: string
  dueTodayCount: number
}

function SnapshotStats({
  studyMinutesThisWeek,
  recentReviewCount,
  recallValue,
  recallHint,
  dueTodayCount,
}: SnapshotStatsProps) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <SectionHeading eyebrow="Today" title="Your learning snapshot" />
        <span className="chip hidden sm:inline-flex">Last 7 days</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Clock3 size={16} />} label="Study time" value={`${studyMinutesThisWeek}m`} hint="Last 7 days" />
        <StatCard icon={<Layers size={16} />} label="Reviews" value={String(recentReviewCount)} hint="Last 7 days" />
        <StatCard icon={<TrendingUp size={16} />} label="Recall" value={recallValue} hint={recallHint} />
        <StatCard
          icon={<Activity size={16} />}
          label="Due"
          value={String(dueTodayCount)}
          hint={dueTodayCount > 0 ? gainFrameDue(dueTodayCount) : 'Nothing waiting'}
        />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Rhythm panel
// ---------------------------------------------------------------------------

type RhythmPanelProps = {
  hasBaseline: boolean
  rhythmChartData: Array<{ id: string; label: string; deviation: number }>
  signalCount: number
  recentSignalCount: number
}

function RhythmPanel({ hasBaseline, rhythmChartData, signalCount, recentSignalCount }: RhythmPanelProps) {
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

function RhythmEmptyState({ hasBaseline, signalCount }: { hasBaseline: boolean; signalCount: number }) {
  return (
    <div className="flex min-h-52 items-center rounded-2xl border border-(--line) bg-(--surface-muted) p-6">
      <div>
        <div className="text-sm font-medium">
          {hasBaseline ? 'Waiting for recent timing observations' : 'Learning your baseline'}
        </div>

        <div className="mt-1 text-xs leading-5 text-(--ink-faint)">
          {hasBaseline
            ? `${signalCount} timing observations available; more are needed for the recent rhythm view.`
            : 'Luminoesis will establish the reference from your actual sensed review sessions.'}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Current-state panel
// ---------------------------------------------------------------------------

type StatePanelProps = {
  learningState: { state: string; reason: string }
  peakLearningHour: number | null
}

function StatePanel({ learningState, peakLearningHour }: StatePanelProps) {
  return (
    <div className="card-flat flex flex-col p-5 md:p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-(--surface-muted)">
          <Flame size={14} />
        </span>
        <h2 className="text-sm font-semibold">Your current state</h2>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-(--surface-muted)">
          <span className={`h-3 w-3 rounded-full ${stateDot(learningState.state)}`} />
        </span>

        <div className="min-w-0">
          <div className="display text-2xl">{learningState.state}</div>

          <p className="mt-0.5 text-sm leading-6 text-(--ink-soft)">
            {learningState.state === 'Insufficient Signal'
              ? 'Standard SM-2 is currently guiding your reviews.'
              : 'Your personal learning baseline is active.'}
          </p>
        </div>
      </div>

      <div className="mt-auto border-t border-(--line) pt-5">
        <p className="mono-label">Best observed window</p>

        <p className="display mt-1 text-xl">
          {peakLearningHour === null ? 'Still learning' : formatHour(peakLearningHour)}
        </p>

        <p className="mt-1 text-xs leading-5 text-(--ink-faint)">
          {peakLearningHour === null
            ? 'More timing observations are needed.'
            : 'Lowest observed deviation from your baseline.'}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insight banner (achievement/quest style)
// ---------------------------------------------------------------------------

function InsightBanner({ text, stat }: { text: string; stat: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-(--veridian)/20 bg-(--veridian-muted) p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-(--veridian) text-white shadow-[0_0_20px_-4px_var(--veridian)]">
          <Sparkles size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="mono-label text-(--veridian)">Personal insight</p>
          <p className="mt-1 text-sm font-medium">{text}</p>
          <p className="mt-1 text-xs leading-5 text-(--ink-soft)">{stat}</p>
        </div>

        <Link to="/review" className="btn-primary shrink-0 no-underline">
          Review now
        </Link>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Retention panel (leaderboard)
// ---------------------------------------------------------------------------

function RetentionPanel({ data }: { data: Array<{ topic: string; rate: number }> }) {
  return (
    <section className="card-flat p-5 md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mono-label">Performance</p>
          <h2 className="mt-1 text-sm font-semibold">Retention by topic</h2>
          <p className="mt-1 text-xs text-(--ink-faint)">Where your recent review history is strongest</p>
        </div>

        <span className="chip hidden sm:inline-flex">Actual review history</span>
      </div>

      <div className="mt-5">{data.length > 0 ? <RetentionBars data={data} /> : <EmptyTopicState />}</div>
    </section>
  )
}

function EmptyTopicState() {
  return (
    <div className="rounded-2xl border border-(--line) bg-(--surface-muted) p-5 text-sm text-(--ink-soft)">
      Complete a few reviews and Luminoesis will show retention by topic here.
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="mono-label">{eyebrow}</p>
      <h2 className="mt-1 text-sm font-semibold">{title}</h2>
    </div>
  )
}

/** Targeting-reticle corner marks — the page's one recurring signature motif. */
function CornerBrackets() {
  return (
    <>
      <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l-2 border-t-2 border-(--veridian)/40" />
      <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r-2 border-t-2 border-(--veridian)/40" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b-2 border-l-2 border-(--veridian)/40" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-(--veridian)/40" />
    </>
  )
}

function stateDot(state: string): string {
  switch (state) {
    case 'Sharp':
      return 'bg-(--emerald)'
    case 'Steady':
      return 'bg-(--veridian)'
    case 'Warming Down':
      return 'bg-(--warning)'
    case 'Recovering':
      return 'bg-(--racing)'
    default:
      return 'bg-(--ink-faint)'
  }
}

function headlineForState(state: string, due: number): string {
  if (state === 'Sharp') {
    return 'You’re ready for more challenging material'
  }

  if (state === 'Warming Down') {
    return 'Familiar material may fit your current rhythm'
  }

  if (state === 'Recovering') {
    return 'Your rhythm is returning toward baseline'
  }

  if (state === 'Insufficient Signal') {
    return due > 0 ? 'A focused review is ready when you are' : 'You’re all caught up — ready when you are'
  }

  return due > 0 ? 'A focused review is ready when you are' : 'You’re all caught up'
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:00 ${suffix}`
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="page-wrap space-y-6 py-6 md:py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your rhythm…</span>

      <div className="card-flat flex flex-col gap-4 p-5 md:flex-row md:items-center md:p-6">
        <div className="flex-1 space-y-3">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-7 w-2/3 max-w-md" />
          <div className="skeleton h-4 w-full max-w-sm" />
        </div>

        <div className="skeleton h-10 w-48 shrink-0 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: SKELETON_STAT_COUNT }).map((_, index) => (
          <div key={index} className="card-flat p-4">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton mt-3 h-6 w-12" />
            <div className="skeleton mt-2 h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <div className="card-flat p-5">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton mt-4 h-52 w-full rounded-xl" />
        </div>

        <div className="card-flat p-5">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton mt-5 h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}