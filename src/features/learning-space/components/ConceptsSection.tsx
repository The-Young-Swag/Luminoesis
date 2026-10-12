import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Lightbulb, Link2, Plus, Trash2 } from 'lucide-react'

import type { Concept, Material } from '#/features/learning-space/domain/learningSpace'
import { deleteConcept } from '#/features/learning-space/application/concept'
import { SectionHeader } from '#/shared/components/ui/SectionHeader'
import { EmptyState } from '#/shared/components/ui/EmptyState'
import { AddConceptDialog } from './AddConceptDialog'

type ConceptsSectionProps = {
  learningSpaceId: string
  concepts: Concept[]
  materials: Material[]
}

export function ConceptsSection({
  learningSpaceId,
  concepts,
  materials,
}: ConceptsSectionProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const materialTitleById = new Map(
    materials.map((material) => [material.id, material.title]),
  )

  async function handleDelete(id: string) {
    setBusyId(id)

    try {
      await deleteConcept(id)
      setConfirmingId(null)
    } catch {
      console.error('Failed to delete concept.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section id="concepts" className="scroll-mt-24">
      <SectionHeader
        icon={Lightbulb}
        title="Concepts"
        description="The key ideas this Learning Space is built around."
        meta={concepts.length > 0 ? `${concepts.length} concept${concepts.length === 1 ? '' : 's'}` : undefined}
        action={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} aria-hidden="true" />
            Add concept
          </button>
        }
      />

      {concepts.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No concepts yet"
          description="Identify the core ideas in your material. Concepts connect multiple sources into one unit of understanding."
          action={
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} aria-hidden="true" />
              Add concept
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {concepts.map((concept) => {
            const confirming = confirmingId === concept.id
            const busy = busyId === concept.id

            return (
              <article
                key={concept.id}
                className="card-flat group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-(--blue)/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--surface-muted) text-(--blue)">
                      <Lightbulb size={17} aria-hidden="true" />
                    </div>

                    <h3 className="truncate text-[15px] font-semibold text-(--ink)">
                      <Link
                        to="/concepts/$conceptId"
                        params={{ conceptId: concept.id }}
                        className="hover:text-(--blue)"
                      >
                        {concept.name}
                      </Link>
                    </h3>
                  </div>

                  {!confirming && (
                    <button
                      type="button"
                      aria-label={`Delete concept ${concept.name}`}
                      onClick={() => setConfirmingId(concept.id)}
                      disabled={busy}
                      className="shrink-0 rounded-lg p-1.5 text-(--ink-faint) opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {concept.description && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-(--ink-soft)">
                    {concept.description}
                  </p>
                )}

                <div className="mt-5 flex-1 border-t border-(--line) pt-4">
                  {concept.materialIds.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link2 size={13} className="text-(--ink-faint)" aria-hidden="true" />

                      {concept.materialIds.map((id) => {
                        const title = materialTitleById.get(id)
                        if (!title) return null
                        return (
                          <span key={id} className="chip">
                            {title}
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-(--ink-faint)">No linked material</span>
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
                      onClick={() => void handleDelete(concept.id)}
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
        <AddConceptDialog
          learningSpaceId={learningSpaceId}
          materials={materials}
          onCreated={() => setShowAdd(false)}
          onClose={() => setShowAdd(false)}
        />
      )}
    </section>
  )
}