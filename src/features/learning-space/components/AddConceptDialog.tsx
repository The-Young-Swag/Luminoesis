import { useState } from 'react'
import { Lightbulb } from 'lucide-react'

import type { Material } from '#/features/learning-space/domain/learningSpace'
import { createConcept } from '#/features/learning-space/application/concept'

type AddConceptDialogProps = {
  learningSpaceId: string
  materials: Material[]
  initialName?: string
  initialMaterialIds?: string[]
  onCreated: () => void
  onClose: () => void
}

export function AddConceptDialog({
  learningSpaceId,
  materials,
  initialName,
  initialMaterialIds,
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
    <div
      className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add concept"
      onClick={onClose}
    >
      <div
        className="glass-surface glass-specular rise max-h-[90vh] w-full max-w-lg overflow-auto rounded-[20px] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-(--ink) text-(--surface)">
            <Lightbulb size={16} aria-hidden="true" />
          </span>

          <div>
            <h3 className="text-[17px] font-semibold">Add concept</h3>

            <p className="mt-1 text-sm text-(--ink-soft)">
              Capture a key idea from this Learning Space.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="text-sm">
            <span className="font-medium">Name</span>

            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              autoFocus
              className="mt-1.5 w-full rounded-full border border-(--line) bg-(--surface) px-3.5 py-2.5 text-sm outline-none focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/20"
              placeholder="e.g. Cardiac output"
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
              className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) p-3 text-[15px] outline-none focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/20"
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
              <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-(--line) p-2">
                {materials.map((material) => {
                  const checked = selectedMaterials.has(material.id)

                  return (
                    <label
                      key={material.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-(--surface-muted)"
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
              <p className="mt-1.5 rounded-xl border border-(--line) px-3 py-3 text-sm text-(--ink-soft)">
                Add material first to link this concept to its sources.
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
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
    </div>
  )
}
