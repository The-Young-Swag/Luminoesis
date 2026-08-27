import { useMemo, useState } from 'react'
import { Brain, Layers, Pencil, Plus, Trash2 } from 'lucide-react'

import type { Concept, Material } from '#/features/learning-space/domain/learningSpace'
import type { Flashcard } from '#/features/flashcard/domain/flashcard'
import { useFlashcards } from '#/features/flashcard/hooks/useFlashcards'
import {
  deleteFlashcard,
} from '#/features/flashcard/application/flashcard'
import { AddFlashcardDialog } from './AddFlashcardDialog'
import { FlashcardReviewOverlay } from './FlashcardReviewOverlay'

type FlashcardsSectionProps = {
  concepts: Concept[]
  materials: Material[]
}

function isDue(dueDate: string, today = new Date()): boolean {
  return today.toISOString().slice(0, 10) >= dueDate
}

export function FlashcardsSection({
  concepts,
  materials,
}: FlashcardsSectionProps) {
  const conceptIds = useMemo(
    () => concepts.map((concept) => concept.id),
    [concepts],
  )

  const { flashcards, ready } = useFlashcards(conceptIds)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Flashcard | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)

  const conceptTitleById = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept.name])),
    [concepts],
  )

  const materialTitleById = useMemo(
    () => new Map(materials.map((material) => [material.id, material.title])),
    [materials],
  )

  const dueFlashcards = useMemo(
    () => flashcards.filter((flashcard) => isDue(flashcard.dueDate)),
    [flashcards],
  )

  const hasConcepts = concepts.length > 0

  async function handleDelete(id: string) {
    setBusyId(id)

    try {
      await deleteFlashcard(id)
      setConfirmingId(null)
    } catch {
      console.error('Failed to delete flashcard.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="display text-xl">Flashcards</h2>

          <p className="mt-1 text-sm text-(--ink-soft)">
            Retrieval prompts tied to concepts in this Learning Space.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setReviewing(true)}
            disabled={dueFlashcards.length === 0}
            className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Brain size={16} aria-hidden="true" />
            Review due ({dueFlashcards.length})
          </button>

          <button
            type="button"
            onClick={() => setShowAdd(true)}
            disabled={!hasConcepts}
            className="btn-ghost inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              hasConcepts
                ? 'Add flashcard'
                : 'Create a concept first'
            }
          >
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        </div>
      </div>

      {!ready ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="skeleton h-32 rounded-xl"
            />
          ))}
        </div>
      ) : !hasConcepts ? (
        <div className="card-flat rise p-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-(--surface-muted) text-(--ink-soft)">
            <Layers size={20} aria-hidden="true" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-(--ink)">
            Concepts come first
          </h3>

          <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-(--ink-soft)">
            Flashcards are tied to concepts. Add a concept to this
            Learning Space, then create flashcards for it.
          </p>
        </div>
      ) : flashcards.length === 0 ? (
        <div className="card-flat rise p-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-(--surface-muted) text-(--ink-soft)">
            <Layers size={20} aria-hidden="true" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-(--ink)">
            No flashcards yet
          </h3>

          <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-(--ink-soft)">
            Turn key concepts into retrieval prompts. Review them to
            strengthen the underlying concept.
          </p>

          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="btn-primary mt-5"
          >
            <Plus size={16} aria-hidden="true" />
            Add flashcard
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flashcards.map((flashcard) => {
            const due = isDue(flashcard.dueDate)
            const confirming = confirmingId === flashcard.id
            const busy = busyId === flashcard.id

            return (
              <article
                key={flashcard.id}
                className="card-flat group flex flex-col p-5 transition hover:border-(--blue)/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-medium text-(--ink)">
                    {flashcard.front}
                  </p>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="Edit flashcard"
                      onClick={() => setEditing(flashcard)}
                      className="rounded-lg p-1.5 text-(--ink-faint) transition hover:bg-(--surface-muted) hover:text-(--ink)"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>

                    {!confirming && (
                      <button
                        type="button"
                        aria-label="Delete flashcard"
                        onClick={() => setConfirmingId(flashcard.id)}
                        disabled={busy}
                        className="rounded-lg p-1.5 text-(--ink-faint) transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="chip">
                    {conceptTitleById.get(flashcard.conceptId) ??
                      'Unknown concept'}
                  </span>

                  <span className="chip capitalize">
                    {flashcard.difficulty}
                  </span>

                  {due ? (
                    <span className="chip bg-(--blue)/10 text-(--blue)">
                      Due
                    </span>
                  ) : (
                    <span className="chip">Scheduled</span>
                  )}
                </div>

                {confirming && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-(--line) pt-3">
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={busy}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(flashcard.id)}
                      disabled={busy}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                    >
                      {busy ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddFlashcardDialog
          concepts={concepts}
          materials={materials}
          onCreated={() => undefined}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <AddFlashcardDialog
          concepts={concepts}
          materials={materials}
          flashcard={editing}
          onCreated={() => setEditing(null)}
          onClose={() => setEditing(null)}
        />
      )}

      {reviewing && (
        <FlashcardReviewOverlay
          flashcards={dueFlashcards}
          conceptTitleById={conceptTitleById}
          materialTitleById={materialTitleById}
          title="Review due"
          onClose={() => setReviewing(false)}
        />
      )}
    </section>
  )
}
