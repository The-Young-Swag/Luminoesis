import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { GraduationCap, Keyboard, Pause } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import type { Card } from '#/features/library/domain/card'
import type { Grade } from '#/features/review/domain/sm2'
import type { AggregatedFeatures } from '#/features/learning-state/domain/signals'

import { formatDueDate } from '#/shared/lib/dates'

import { daysOverdue } from '#/features/review/domain/sm2'
import {
  adaptQueue,
  buildQueue,
} from '#/features/review/domain/adapt'
import {
  isElevatedLoad,
  recommendBreakMinutes,
} from '#/features/learning-state/domain/baseline'

import { completeCalibration } from '#/features/review/application/completeCalibration'
import { loadReview } from '#/features/review/application/loadReview'
import { saveSignal } from '#/features/review/application/saveSignal'
import { submitReview } from '#/features/review/application/submitReview'

import { useBaseline } from '#/features/learning-state/hooks/useBaseline'
import { useSignalCapture } from '#/features/review/hooks/useSignalCapture'

import { CalibrationBanner } from '#/features/review/components/CalibrationBanner'
import { AdaptationBanner } from '#/features/review/components/AdaptationBanner'
import { QuestionView } from '#/features/review/components/QuestionView'
import { GradeControls } from '#/features/review/components/GradeControls'
import { SessionComplete } from '#/features/review/components/SessionComplete'

import {
  trackAdaptiveDismiss,
  trackAdaptiveOffer,
} from '#/features/dashboard/domain/metrics'

export function ReviewPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [queue, setQueue] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [showBack, setShowBack] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [adaptReason, setAdaptReason] =
    useState<string | null>(null)

  const [breakRec, setBreakRec] =
    useState<number | null>(null)

  const [isBreak, setIsBreak] = useState(false)

  const [calibrationN, setCalibrationN] = useState(0)
  const [optIn, setOptIn] = useState(false)

  const dismissedRef = useRef(false)

  const pendingAdaptRef = useRef<{
    reason: string
    rec: number
    adapted: ReturnType<typeof adaptQueue>
  } | null>(null)

  const sessionIdRef = useRef(
    `sess-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`,
  )

  const startedAtRef = useRef(Date.now())

  const minutesRef = useRef<AggregatedFeatures[]>([])

  const {
    baseline,
    hasBaseline,
  } = useBaseline()

  const captureEnabled = optIn && hasBaseline

  const { live } = useSignalCapture(captureEnabled)

  const isCalibrating =
    calibrationN < 5 && !hasBaseline

  const current = queue[idx]

  const progress = queue.length
    ? `${Math.min(idx + 1, queue.length)} / ${queue.length}`
    : '0 / 0'

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const {
        cards: loadedCards,
        adaptiveOptIn,
        calibrationSessions,
      } = await loadReview()

      setCards(loadedCards)
      setOptIn(adaptiveOptIn)
      setCalibrationN(calibrationSessions)
      setQueue(buildQueue(loadedCards))
    } catch (cause) {
      console.error(
        'Failed to load review:',
        cause,
      )

      setError(
        cause instanceof Error
          ? cause
          : new Error('Failed to load review'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (
      !live ||
      !captureEnabled ||
      dismissedRef.current
    ) {
      return
    }

    minutesRef.current.push(live)

    if (minutesRef.current.length > 12) {
      minutesRef.current.shift()
    }

    void saveSignal({
      id: crypto.randomUUID().slice(0, 8),
      sessionId: sessionIdRef.current,
      minuteIndex:
        minutesRef.current.length - 1,
      timestamp: new Date().toISOString(),
      interKeyLatency: live.interKeyLatency,
      dwellTime: live.dwellTime,
      correctionRate: live.correctionRate,
      wpm: live.wpm,
    })

    const elevated = isElevatedLoad(
      minutesRef.current,
      baseline,
    )

    const recoverySamples: number[] = []

    const recommendedBreak =
      recoverySamples.length > 0
        ? recommendBreakMinutes(recoverySamples)
        : null

    const adapted = adaptQueue(
      buildQueue(cards),
      {
        isElevated: elevated,
        hasBaseline,
        adaptiveOptIn: optIn,
        breakMinutes:
          recommendedBreak ?? 5,
      },
    )

    if (
      adapted.shouldAdapt &&
      adapted.reason
    ) {
      pendingAdaptRef.current = {
        reason: adapted.reason,
        rec: recommendedBreak ?? 5,
        adapted,
      }

      setAdaptReason(adapted.reason)
      setBreakRec(recommendedBreak)

      void trackAdaptiveOffer()
    }
  }, [
    live,
    captureEnabled,
    baseline,
    hasBaseline,
    optIn,
    cards,
  ])

  const handleGrade = useCallback(
    async (grade: Grade) => {
      if (idx >= queue.length) {
        return
      }

      const card = queue[idx]

      await submitReview({
        card,
        grade,
        sessionId: sessionIdRef.current,
        startedAt: startedAtRef.current,
        live,
      })

      const nextIdx = idx + 1

      if (nextIdx >= queue.length) {
        setIdx(nextIdx)

        if (calibrationN < 5) {
          const nextCalibrationN =
            await completeCalibration(
              calibrationN,
            )

          setCalibrationN(nextCalibrationN)
        }
      } else {
        setIdx(nextIdx)
        setShowBack(false)
      }

      const refreshedReview =
        await loadReview()

      setCards(refreshedReview.cards)
    },
    [
      queue,
      idx,
      live,
      calibrationN,
    ],
  )

  if (isLoading) {
    return (
      <div
        className="page-wrap py-6"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">
          Loading cards…
        </span>

        <div className="flex items-center justify-between">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>

        <div className="card-flat mt-4 p-6 sm:p-8">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-3 h-6 w-3/4" />
          <div className="skeleton mt-8 h-10 w-36 rounded-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wrap py-12">
        <div className="card-flat p-8 text-center sm:p-12">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-(--surface-muted)">
            <GraduationCap
              size={22}
              className="text-(--ink-soft)"
            />
          </div>

          <h1 className="display mt-5 text-2xl">
            We couldn't start your review
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-(--ink-soft)">
            Something went wrong while loading
            your study cards.
          </p>

          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() => void load()}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="page-wrap py-12">
        <div className="card-flat p-8 text-center sm:p-12">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-(--surface-muted)">
            <GraduationCap
              size={22}
              className="text-(--ink-soft)"
            />
          </div>

          <h1 className="display mt-5 text-2xl">
            Nothing to review yet
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-(--ink-soft)">
            Add some study cards to your
            library first. Once they're due,
            they'll appear here as a focused
            review session.
          </p>

          <ol className="mx-auto mt-6 grid max-w-lg gap-2 text-left sm:grid-cols-3">
            {[
              { step: '1', title: 'Add cards', detail: 'Capture ideas in the library' },
              { step: '2', title: 'Review when due', detail: 'Short, focused sessions' },
              { step: '3', title: 'Retain', detail: 'Timing adapts to your rhythm' },
            ].map((item) => (
              <li
                key={item.step}
                className="rounded-xl border border-(--line) bg-(--surface-muted) p-3"
              >
                <span className="font-mono text-xs font-semibold tabular-nums text-(--veridian)">
                  {item.step}
                </span>
                <p className="mt-1 text-sm font-semibold text-(--ink)">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-(--ink-soft)">
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>

          <Link
            to="/library"
            className="btn-primary mt-6 inline-flex no-underline"
          >
            Go to Library
          </Link>
        </div>
      </div>
    )
  }

  if (idx >= queue.length) {
    const minutes = Math.max(
      0,
      Math.round(
        (Date.now() -
          startedAtRef.current) /
          60000,
      ),
    )

    return (
      <SessionComplete
        minutes={minutes}
        totalCards={queue.length}
        live={live}
        onRestart={() => {
          setIdx(0)
          setShowBack(false)
          startedAtRef.current = Date.now()
          void load()
        }}
      />
    )
  }

  return (
    <div className="page-wrap py-6">
      {isCalibrating && (
        <CalibrationBanner
          calibrationN={calibrationN}
        />
      )}

      {adaptReason && !isCalibrating && (
        <AdaptationBanner
          reason={adaptReason}
          onKeep={() => {
            dismissedRef.current = true
            setAdaptReason(null)
            pendingAdaptRef.current = null

            void trackAdaptiveDismiss()
          }}
          onSwitch={() => {
            const pending =
              pendingAdaptRef.current

            if (pending) {
              setQueue((previousQueue) => {
                const completedIds =
                  new Set(
                    previousQueue
                      .slice(0, idx)
                      .map(
                        (card) => card.id,
                      ),
                  )

                const remaining =
                  pending.adapted.orderedCards.filter(
                    (card) =>
                      !completedIds.has(
                        card.id,
                      ),
                  )

                return [
                  ...previousQueue.slice(
                    0,
                    idx,
                  ),
                  ...remaining,
                ]
              })
            }

            setAdaptReason(null)
            pendingAdaptRef.current = null
          }}
        />
      )}

      <ReviewHeader
        progress={progress}
        topic={current.topic}
        dueDate={current.dueDate}
        captureEnabled={captureEnabled}
        breakRec={breakRec}
        isCalibrating={isCalibrating}
        isBreak={isBreak}
        onToggleBreak={() =>
          setIsBreak((value) => !value)
        }
      />

      {isBreak ? (
        <ReviewBreak
          breakRec={breakRec}
          onResume={() => setIsBreak(false)}
        />
      ) : (
        <ReviewCard
          card={current}
          showBack={showBack}
          captureEnabled={captureEnabled}
          live={live}
          onShowBack={() =>
            setShowBack(true)
          }
          onHideBack={() =>
            setShowBack(false)
          }
          onGrade={handleGrade}
        />
      )}

      <ReviewNavigation />
    </div>
  )
}

type ReviewHeaderProps = {
  progress: string
  topic: string
  dueDate: string
  captureEnabled: boolean
  breakRec: number | null
  isCalibrating: boolean
  isBreak: boolean
  onToggleBreak: () => void
}

function ReviewHeader({
  progress,
  topic,
  dueDate,
  captureEnabled,
  breakRec,
  isCalibrating,
  isBreak,
  onToggleBreak,
}: ReviewHeaderProps) {
  const overdueDays = daysOverdue(dueDate)

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm tabular-nums text-(--ink-faint)">
        <span
          className="font-medium text-(--ink)"
          role="status"
          aria-live="polite"
          aria-label={`Card ${progress} in queue`}
        >
          {progress}
        </span>{' '}
        · {topic} ·{' '}
        <time dateTime={dueDate}>due {formatDueDate(dueDate)}</time>{' '}

        {overdueDays > 0 ? (
          <span className="text-(--warning-strong)">
            · {overdueDays}d overdue
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
            captureEnabled
              ? 'border-(--emerald)/30 bg-(--emerald-muted) text-(--veridian-strong)'
              : 'border-(--line) bg-(--surface-muted) text-(--ink-faint)'
          }`}
        >
          <Keyboard size={12} />

          {captureEnabled
            ? 'Sensing'
            : 'Standard SM-2'}
        </span>

        {breakRec &&
        !isCalibrating ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-(--ink) px-3 py-1.5 text-xs font-medium text-(--surface)"
            onClick={onToggleBreak}
          >
            <Pause size={12} />

            {isBreak
              ? 'Resume'
              : `Break ${breakRec}m`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

type ReviewBreakProps = {
  breakRec: number | null
  onResume: () => void
}

function ReviewBreak({
  breakRec,
  onResume,
}: ReviewBreakProps) {
  return (
    <div className="card-flat mt-4 p-10 text-center">
      <h2 className="display text-2xl">
        {breakRec
          ? `Take ${breakRec} minutes`
          : 'Take a short break'}
      </h2>

      <p className="mt-2 text-sm text-(--ink-soft)">
        A short pause is available if it
        feels useful. You decide when to
        return.
      </p>

      <button
        type="button"
        className="btn-primary mt-6"
        onClick={onResume}
      >
        Back to review
      </button>
    </div>
  )
}

type ReviewCardProps = {
  card: Card
  showBack: boolean
  captureEnabled: boolean
  live: AggregatedFeatures | null
  onShowBack: () => void
  onHideBack: () => void
  onGrade: (grade: Grade) => void
}

function ReviewCard({
  card,
  showBack,
  captureEnabled,
  live,
  onShowBack,
  onHideBack,
  onGrade,
}: ReviewCardProps) {
  return (
    <div className="card-flat mt-4 p-6 sm:p-8">
      <QuestionView
        front={card.front}
        back={card.back}
        showBack={showBack}
        onShowBack={onShowBack}
        onHideBack={onHideBack}
      />

      {showBack ? (
        <GradeControls onGrade={onGrade} />
      ) : null}

      <div className="mt-6 flex items-center gap-2 text-xs text-(--ink-faint)">
        <span className="h-2 w-2 rounded-full bg-(--line-strong)" />
        Type in the answer field to let rhythm
        sensing work — or just grade without
        typing.
      </div>

      <input
        aria-label="Type your answer (timing only, content not stored)"
        placeholder="Type your answer… (optional — timing only)"
        className="mt-4 w-full rounded-xl border border-(--line) bg-(--surface) px-4 py-3 text-sm outline-none focus:border-(--veridian) focus:ring-2 focus:ring-(--veridian)/15"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      <SignalStatus
        captureEnabled={captureEnabled}
        live={live}
      />
    </div>
  )
}

type SignalStatusProps = {
  captureEnabled: boolean
  live: AggregatedFeatures | null
}

function SignalStatus({
  captureEnabled,
  live,
}: SignalStatusProps) {
  const status = captureEnabled
    ? live
      ? 'Personal signal active'
      : 'Listening…'
    : 'Standard scheduling — adaptive off or calibrating'

  return (
    <div
      className="mt-3 flex items-center gap-2 text-xs font-mono text-(--ink-faint)"
      aria-live="polite"
    >
      <span
        className={`h-2 w-2 rounded-full ${
          captureEnabled
            ? 'bg-(--emerald)'
            : 'bg-(--line-strong)'
        }`}
        aria-hidden
      />

      <span>{status}</span>

      <span className="hidden sm:inline">
        •
      </span>

      <span className="hidden sm:inline">
        Timing only, never content
      </span>
    </div>
  )
}

function ReviewNavigation() {
  return (
    <nav aria-label="Review" className="mt-4 flex gap-2">
      <Link
        to="/library"
        className="btn-ghost no-underline text-xs"
      >
        Library
      </Link>

      <Link
        to="/"
        className="btn-ghost no-underline text-xs"
      >
        Dashboard
      </Link>
    </nav>
  )
}