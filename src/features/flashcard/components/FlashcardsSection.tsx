import { useMemo, useState } from 'react'
import { Brain, Layers, Pencil, Plus, Trash2 } from 'lucide-react'

import type { Concept, Material } from '#/features/learning-space/domain/learningSpace'
import type { Flashcard } from '#/features/flashcard/domain/flashcard'
import { useFlashcards } from '#/features/flashcard/hooks/useFlashcards'
import { deleteFlashcard } from '#/features/flashcard/application/flashcard'
import { SectionHeader } from '#/shared/components/ui/SectionHeader'
import { EmptyState } from '#/shared/components/ui/EmptyState'
import { AddFlashcardDialog } from './AddFlashcardDialog'
import { AddConceptDialog } from '#/features/learning-space/components/AddConceptDialog'
import { FlashcardReviewOverlay } from './FlashcardReviewOverlay'

type FlashcardsSectionProps = {
  learningSpaceId: string
  concepts: Concept[]
  materials: Material[]
}

function isDue(dueDate: string, today = new Date()): boolean {
  return today.toISOString().slice(0, 10) >= dueDate
}

export function FlashcardsSection({ learningSpaceId, concepts, materials }: FlashcardsSectionProps) {
  const conceptIds = useMemo(() => concepts.map((concept) => concept.id), [concepts])

  const { flashcards, ready } = useFlashcards(conceptIds)

  const [showAdd, setShowAdd] = useState(false)
  const [showAddConcept, setShowAddConcept] = useState(false)
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
    <section id="flashcards" className="scroll-mt-24">
      <SectionHeader
        title="Flashcards"
        description="Retrieval prompts tied to concepts in this Learning Space."
        meta={flashcards.length > 0 ? `${flashcards.length} card${flashcards.length === 1 ? '' : 's'}` : undefined}
        action={
          <div className="flex flex-wrap items-center gap-3">
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
              title={hasConcepts ? 'Add flashcard' : 'Create a concept first'}
            >
              <Plus size={16} aria-hidden="true" />
              Add
            </button>
          </div>
        }
      />

      {!ready ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      ) : !hasConcepts ? (
        <EmptyState
          icon={Layers}
          title="Concepts come first"
          description="Flashcards are tied to concepts. Add a concept to this Learning Space, then create flashcards for it."
          action={
            <button type="button" onClick={() => setShowAddConcept(true)} className="btn-primary">
              Add concept
            </button>
          }
        />
      ) : flashcards.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No flashcards yet"
          description="Turn key concepts into retrieval prompts. Review them to strengthen the underlying concept."
          action={
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} aria-hidden="true" />
              Add flashcard
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {flashcards.map((flashcard) => {
            const due = isDue(flashcard.dueDate)
            const confirming = confirmingId === flashcard.id
            const busy = busyId === flashcard.id

            return (
              <article
                key={flashcard.id}
                className="card-flat group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-(--blue)/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-[15px] font-medium text-(--ink)">
                    {flashcard.front}
                  </p>

                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
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
                        aria-label={`Delete flashcard: ${flashcard.front}`}
                        title="Delete flashcard"
                        onClick={() => setConfirmingId(flashcard.id)}
                        disabled={busy}
                        className="rounded-lg p-1.5 text-(--ink-faint) transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-1 flex-wrap items-center gap-1.5">
                  <span className="chip">
                    {conceptTitleById.get(flashcard.conceptId) ?? 'Unknown concept'}
                  </span>

                  <span className="chip capitalize">{flashcard.difficulty}</span>

                  {due ? (
                    <span className="chip bg-(--blue)/10 text-(--blue)">Due</span>
                  ) : (
                    <span className="chip">Scheduled</span>
                  )}
                </div>

                {confirming && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-(--line) pt-4">
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

      <AddFlashcardDialog
        open={showAdd || editing !== null}
        concepts={concepts}
        materials={materials}
        flashcard={editing ?? undefined}
        onCreated={() => {
          setShowAdd(false)
          setEditing(null)
        }}
        onClose={() => {
          setShowAdd(false)
          setEditing(null)
        }}
      />

      <AddConceptDialog
        open={showAddConcept}
        learningSpaceId={learningSpaceId}
        materials={materials}
        onCreated={() => setShowAddConcept(false)}
        onClose={() => setShowAddConcept(false)}
      />

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