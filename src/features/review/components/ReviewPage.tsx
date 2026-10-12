import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { GraduationCap, Keyboard, Pause } from 'lucide-react'
import { Link, getRouteApi } from '@tanstack/react-router'

import { FlashcardDecks } from '#/features/flashcard/components/FlashcardReviewPage'

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
  const { tab = 'cards', topic } = getRouteApi('/review').useSearch()

  return (
    <div className="page-wrap space-y-6 py-6 md:py-8">
      <ReviewTabs tab={tab} />

      {tab === 'flashcards' ? <FlashcardDecks /> : <ReviewSession topic={topic} />}
    </div>
  )
}

function ReviewTabs({ tab }: { tab: 'cards' | 'flashcards' }) {
  const base =
    'rounded-xl px-4 py-2.5 text-sm font-medium transition-colors min-h-11 inline-flex items-center'
  const active = 'bg-(--surface) text-(--ink) shadow-sm'
  const idle = 'text-(--ink-soft) hover:text-(--ink)'

  return (
    <nav
      aria-label="Review modes"
      className="flex w-fit items-center gap-1 rounded-2xl bg-(--surface-muted) p-1.5"
    >
      <Link
        to="/review"
        search={{ tab: 'cards' }}
        aria-current={tab === 'cards' ? 'page' : undefined}
        className={`${base} ${tab === 'cards' ? active : idle} no-underline`}
      >
        Study cards
      </Link>
      <Link
        to="/review"
        search={{ tab: 'flashcards' }}
        aria-current={tab === 'flashcards' ? 'page' : undefined}
        className={`${base} ${tab === 'flashcards' ? active : idle} no-underline`}
      >
        Flashcard decks
      </Link>
    </nav>
  )
}

function ReviewSession({ topic }: { topic?: string }) {
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
        setQueue(
          buildQueue(
            topic
              ? loadedCards.filter((card) => card.topic === topic)
              : loadedCards,
          ),
        )
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
  }, [topic])

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
  if (topic && queue.length === 0) {
    return (
      <div className="py-6">
        <div className="card-flat p-8 text-center sm:p-12">
          <p className="eyebrow">Filtered review</p>

          <h1 className="display mt-2 text-2xl">
            Nothing due for {topic}
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-(--ink-soft)">
            No cards in this topic are waiting. Clear the filter to review
            everything due.
          </p>

          <Link
            to="/review"
            search={{ tab: 'cards' }}
            className="btn-primary mt-6 inline-flex no-underline"
          >
            Review everything due
          </Link>
        </div>
      </div>
    )
  }

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
      <div className="py-6">
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
      <div className="py-6">
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
    <>
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
        done={Math.min(idx + 1, queue.length)}
        total={queue.length}
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
    </>
  )
}

type ReviewHeaderProps = {
  done: number
  total: number
  topic: string
  dueDate: string
  captureEnabled: boolean
  breakRec: number | null
  isCalibrating: boolean
  isBreak: boolean
  onToggleBreak: () => void
}

function ReviewHeader({
  done,
  total,
  topic,
  dueDate,
  captureEnabled,
  breakRec,
  isCalibrating,
  isBreak,
  onToggleBreak,
}: ReviewHeaderProps) {
  const overdueDays = daysOverdue(dueDate)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div>
    <div className="flex items-center justify-between">
      <div className="text-sm tabular-nums text-(--ink-faint)">
        <span
          className="font-medium text-(--ink)"
          role="status"
          aria-live="polite"
          aria-label={`Card ${done} of ${total} in queue`}
        >
          {done} / {total}
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

    <div
      role="progressbar"
      aria-label="Session progress"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      className="mt-3 h-1 overflow-hidden rounded-full bg-(--surface-muted)"
    >
      <div
        className="h-full rounded-full bg-(--veridian) transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
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