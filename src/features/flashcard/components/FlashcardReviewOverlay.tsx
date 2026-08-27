import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Eye, X } from 'lucide-react'

import type { Flashcard } from '#/features/flashcard/domain/flashcard'
import type { Grade } from '#/features/review/domain/sm2'
import { gradeFlashcard } from '#/features/flashcard/application/flashcard'

type FlashcardReviewOverlayProps = {
  flashcards: Flashcard[]
  conceptTitleById: Map<string, string>
  materialTitleById?: Map<string, string>
  title?: string
  onClose: () => void
}

const GRADE_BUTTONS: Array<{
  grade: Grade
  label: string
  key: string
  className: string
}> = [
  {
    grade: 0,
    label: 'Again',
    key: '1',
    className:
      'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400',
  },
  {
    grade: 1,
    label: 'Hard',
    key: '2',
    className:
      'bg-amber-500 text-white hover:bg-amber-400 focus-visible:ring-amber-400',
  },
  {
    grade: 2,
    label: 'Good',
    key: '3',
    className:
      'bg-(--blue) text-white hover:opacity-90 focus-visible:ring-(--blue)',
  },
  {
    grade: 3,
    label: 'Easy',
    key: '4',
    className:
      'bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-400',
  },
]

export function FlashcardReviewOverlay({
  flashcards,
  conceptTitleById,
  materialTitleById,
  title = 'Review',
  onClose,
}: FlashcardReviewOverlayProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const startedAtRef = useRef<number>(Date.now())

  const total = flashcards.length
  const finished = index >= total
  const current: Flashcard | undefined = flashcards[index]

  const advance = useCallback(() => {
    setRevealed(false)
    setIndex((previous) => previous + 1)
    startedAtRef.current = Date.now()
  }, [])

  const handleGrade = useCallback(
    async (grade: Grade) => {
      if (busy || finished) {
        return
      }

      setBusy(true)

      try {
        await gradeFlashcard({
          flashcardId: current.id,
          grade,
          startedAt: startedAtRef.current,
        })

        setReviewedCount((count) => count + 1)
        advance()
      } catch {
        console.error('Failed to record flashcard review.')
      } finally {
        setBusy(false)
      }
    },
    [current, busy, advance, finished],
  )

  const handleReveal = useCallback(() => {
    if (!revealed && !busy) {
      setRevealed(true)
    }
  }, [revealed, busy])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (finished) {
        return
      }

      if (!revealed) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          handleReveal()
        }

        return
      }

      const match = GRADE_BUTTONS.find((button) => button.key === event.key)

      if (match) {
        event.preventDefault()
        void handleGrade(match.grade)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [finished, revealed, handleReveal, handleGrade])

  return (
    <div
      className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="glass-surface glass-specular rise w-full max-w-2xl rounded-[20px] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">{title}</p>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="glass-pill grid h-8 w-8 place-items-center text-(--ink-soft)"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {finished || total === 0 ? (
          <div className="mt-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-(--surface-muted) text-(--blue)">
              <CheckCircle2 size={24} aria-hidden="true" />
            </div>

            <h2 className="display mt-4 text-2xl">
              {total === 0 ? 'Nothing due' : 'Review complete'}
            </h2>

            <p className="mt-2 text-sm text-(--ink-soft)">
              {total === 0
                ? 'There are no flashcards due right now.'
                : `You reviewed ${reviewedCount} ${
                    reviewedCount === 1 ? 'card' : 'cards'
                  }.`}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="btn-primary mt-6"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-(--ink-faint)">
              <span>
                Card {index + 1} of {total}
              </span>

              <span>{reviewedCount} reviewed</span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-(--surface-muted)">
              <div
                className="h-full rounded-full bg-(--blue) transition-all"
                style={{ width: `${((index + (revealed ? 1 : 0)) / total) * 100}%` }}
              />
            </div>

            <article className="card-flat mt-5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">
                  {conceptTitleById.get(current.conceptId) ??
                    'Unknown concept'}
                </span>

                {current.materialId &&
                  materialTitleById?.get(current.materialId) && (
                    <span className="chip">
                      {materialTitleById.get(current.materialId)}
                    </span>
                  )}

                <span className="chip capitalize">
                  {current.difficulty}
                </span>
              </div>

              <p className="mt-4 text-lg font-medium text-(--ink)">
                {current.front}
              </p>

              {revealed && (
                <div className="mt-4 border-t border-(--line) pt-4">
                  <p className="text-(--ink-soft)">{current.back}</p>
                </div>
              )}
            </article>

            <div className="mt-6 flex flex-col gap-3">
              {!revealed ? (
                <button
                  type="button"
                  onClick={handleReveal}
                  className="btn-primary inline-flex items-center justify-center gap-2"
                >
                  <Eye size={16} aria-hidden="true" />
                  Reveal answer
                  <span className="ml-1 font-mono text-xs opacity-70">
                    Space
                  </span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {GRADE_BUTTONS.map((button) => (
                    <button
                      key={button.grade}
                      type="button"
                      disabled={busy}
                      onClick={() => void handleGrade(button.grade)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${button.className}`}
                    >
                      {button.label}
                      <span className="font-mono text-xs opacity-70">
                        {button.key}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
