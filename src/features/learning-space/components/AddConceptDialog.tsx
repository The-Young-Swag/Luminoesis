import { useState } from 'react'
import { Lightbulb } from 'lucide-react'

import type { Material } from '#/features/learning-space/domain/learningSpace'
import { Dialog } from '#/shared/components/ui/Dialog'
import { createConcept } from '#/features/learning-space/application/concept'

type AddConceptDialogProps = {
  learningSpaceId: string
  materials: Material[]
  initialName?: string
  initialMaterialIds?: string[]
  onCreated: () => void
  open: boolean
  onClose: () => void
}

export function AddConceptDialog({
  learningSpaceId,
  materials,
  initialName,
  initialMaterialIds,
  open,
  onCreated,
  onClose,
}: AddConceptDialogProps) {
  const [name, setName] = useState(initialName ?? '')
  const [description, setDescription] = useState('')
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(
    new Set(initialMaterialIds ?? []),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canLinkMaterials = materials.length > 0

  function toggleMaterial(id: string) {
    setSelectedMaterials((previous) => {
      const next = new Set(previous)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Give the concept a name.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await createConcept({
        learningSpaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        materialIds: Array.from(selectedMaterials),
      })

      onCreated()
      onClose()
    } catch {
      setError('The concept could not be added.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Add concept"
    >
      <div className="max-h-[80vh] w-full overflow-auto p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--ink) text-(--surface)">
            <Lightbulb size={17} aria-hidden="true" />
          </span>

          <div>
            <h3 className="text-lg font-semibold">Add concept</h3>

            <p className="mt-1.5 text-sm text-(--ink-soft)">
              Capture a key idea from this Learning Space.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-5">
          <label className="text-sm">
            <span className="font-medium">Name</span>

            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              autoFocus
              className="mt-2 w-full rounded-full border border-(--line) bg-(--surface) px-4 py-3 text-sm outline-none focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/20"
              placeholder="e.g. Cardiac output…"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">
              Description
              <span className="font-normal text-(--ink-faint)">
                {' '}
                (optional)
              </span>
            </span>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-(--line) bg-(--surface) p-4 text-[15px] leading-relaxed outline-none focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/20"
              placeholder="What does this concept mean?"
            />
          </label>

          <div className="text-sm">
            <span className="font-medium">
              Source material
              <span className="font-normal text-(--ink-faint)">
                {' '}
                (optional)
              </span>
            </span>

            {canLinkMaterials ? (
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-(--line) p-2.5">
                {materials.map((material) => {
                  const checked = selectedMaterials.has(material.id)

                  return (
                    <label
                      key={material.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-(--surface-muted)"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMaterial(material.id)}
                        className="h-4 w-4 accent-(--blue)"
                      />

                      <span className="truncate text-sm text-(--ink)">
                        {material.title}
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="mt-2 rounded-xl border border-(--line) px-4 py-4 text-sm text-(--ink-soft)">
                Add material first to link this concept to its sources.
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-ghost"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add concept'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}