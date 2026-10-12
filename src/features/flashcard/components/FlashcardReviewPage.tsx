import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Brain, Layers } from 'lucide-react'

import { useFlashcardReviewQueue } from '../hooks/useFlashcardReview'
import { FlashcardReviewOverlay } from './FlashcardReviewOverlay'

export function FlashcardReviewPage() {
  const { due, conceptTitleById, materialTitleById, ready } =
    useFlashcardReviewQueue()

  const [reviewing, setReviewing] = useState(false)

  if (!ready) {
    return (
      <main className="page-wrap py-8" aria-busy="true">
        <span className="sr-only">Loading flashcards…</span>

        <div className="skeleton h-8 w-56" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap py-8">
      <p className="eyebrow">Practice</p>

      <h1 className="display mt-2 text-3xl tracking-tight">Flashcards</h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ink-soft)">
        Active recall across every concept. Review the cards that are
        due and strengthen the underlying concepts.
      </p>

      {due.length === 0 ? (
        <div className="card-flat rise mt-10 p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-(--surface-muted) text-(--ink-soft)">
            <Brain size={22} aria-hidden="true" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-(--ink)">
            Nothing due right now
          </h3>

          <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-(--ink-soft)">
            Every due flashcard has been reviewed. Add flashcards from a
            Learning Space, or open a space to create more.
          </p>

          <Link
            to="/learning-spaces"
            className="btn-primary mt-5 inline-flex items-center justify-center gap-2"
          >
            <Layers size={16} aria-hidden="true" />
            Go to Learning Spaces
          </Link>
        </div>
      ) : (
        <FlashcardDecksBody
          due={due}
          conceptTitleById={conceptTitleById}
          reviewing={reviewing}
          setReviewing={setReviewing}
          materialTitleById={materialTitleById}
        />
      )}
    </main>
  )
}

export function FlashcardDecks() {
  const { due, conceptTitleById, materialTitleById, ready } =
    useFlashcardReviewQueue()

  const [reviewing, setReviewing] = useState(false)

  if (!ready) {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading flashcards…</span>

        <div className="skeleton h-8 w-56" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (due.length === 0) {
    return (
      <div className="card-flat rise mt-10 p-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-(--surface-muted) text-(--ink-soft)">
          <Brain size={22} aria-hidden="true" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-(--ink)">
          Nothing due right now
        </h3>

        <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-(--ink-soft)">
          Every due flashcard has been reviewed. Add flashcards from a
          Learning Space, or open a space to create more.
        </p>

        <Link
          to="/learning-spaces"
          className="btn-primary mt-5 inline-flex items-center justify-center gap-2"
        >
          <Layers size={16} aria-hidden="true" />
          Go to Learning Spaces
        </Link>
      </div>
    )
  }

  return (
    <FlashcardDecksBody
      due={due}
      conceptTitleById={conceptTitleById}
      reviewing={reviewing}
      setReviewing={setReviewing}
      materialTitleById={materialTitleById}
    />
  )
}

type FlashcardDecksBodyProps = {
  due: ReturnType<typeof useFlashcardReviewQueue>['due']
  conceptTitleById: ReturnType<typeof useFlashcardReviewQueue>['conceptTitleById']
  materialTitleById: ReturnType<typeof useFlashcardReviewQueue>['materialTitleById']
  reviewing: boolean
  setReviewing: (value: boolean) => void
}

function FlashcardDecksBody({
  due,
  conceptTitleById,
  materialTitleById,
  reviewing,
  setReviewing,
}: FlashcardDecksBodyProps) {
  return (
    <>
      <div className="card-flat rise mt-8 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-2xl font-semibold text-(--ink)">
            {due.length} {due.length === 1 ? 'card' : 'cards'} due
          </p>

          <p className="mt-1 text-sm text-(--ink-soft)">
            Spread across{' '}
            {new Set(due.map((flashcard) => flashcard.conceptId)).size}{' '}
            {new Set(due.map((flashcard) => flashcard.conceptId)).size === 1
              ? 'concept'
              : 'concepts'}
            .
          </p>
        </div>

        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Brain size={16} aria-hidden="true" />
          Start review
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {due.map((flashcard) => (
          <article
            key={flashcard.id}
            className="card-flat p-5"
          >
            <p className="line-clamp-2 text-sm font-medium text-(--ink)">
              {flashcard.front}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="chip">
                {conceptTitleById.get(flashcard.conceptId) ??
                  'Unknown concept'}
              </span>

              <span className="chip capitalize">
                {flashcard.difficulty}
              </span>
            </div>
          </article>
        ))}
      </div>

      {reviewing && (
        <FlashcardReviewOverlay
          flashcards={due}
          conceptTitleById={conceptTitleById}
          materialTitleById={materialTitleById}
          title="Flashcard review"
          onClose={() => setReviewing(false)}
        />
      )}
    </>
  )
}
