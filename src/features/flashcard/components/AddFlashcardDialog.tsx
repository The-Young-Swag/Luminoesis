import { useState, useTransition  } from 'react'
import { Plus } from 'lucide-react'

import type { Concept, Material } from '#/features/learning-space/domain/learningSpace'
import type { Flashcard, FlashcardDifficulty } from '#/features/flashcard/domain/flashcard'
import { Dialog } from '#/shared/components/ui/Dialog'
import {
  createFlashcard,
  updateFlashcard,
} from '#/features/flashcard/application/flashcard'

type AddFlashcardDialogProps = {
  concepts: Concept[]
  materials: Material[]
  flashcard?: Flashcard
  initialFront?: string
  initialMaterialId?: string
  onCreated: () => void
  open: boolean
  onClose: () => void
}

const DIFFICULTIES: FlashcardDifficulty[] = [
  'easy',
  'medium',
  'hard',
]

export function AddFlashcardDialog({
  concepts,
  materials,
  flashcard,
  initialFront,
  initialMaterialId,
  open,
  onCreated,
  onClose,
}: AddFlashcardDialogProps) {
  const [conceptId, setConceptId] = useState<string>(() =>
    flashcard?.conceptId ?? (concepts.length > 0 ? concepts[0].id : ''),
  )
  const [front, setFront] = useState(flashcard?.front ?? initialFront ?? '')
  const [back, setBack] = useState(flashcard?.back ?? '')
  const [difficulty, setDifficulty] = useState<FlashcardDifficulty>(
    flashcard?.difficulty ?? 'medium',
  )
  const [materialId, setMaterialId] = useState(
    flashcard?.materialId ?? initialMaterialId ?? '',
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = Boolean(flashcard)

  function save() {
    if (!conceptId) {
      setError('Choose the concept this card belongs to.')
      return
    }

    if (!front.trim() || !back.trim()) {
      setError('Both the front and back are required.')
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        if (isEdit && flashcard) {
          await updateFlashcard(flashcard.id, {
            conceptId,
            front: front.trim(),
            back: back.trim(),
            difficulty,
            materialId: materialId || undefined,
          })
        } else {
          await createFlashcard({
            conceptId,
            front: front.trim(),
            back: back.trim(),
            difficulty,
            materialId: materialId || undefined,
          })
        }

        onCreated()
        onClose()
      } catch {
        setError('The flashcard could not be saved.')
      }
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label={isEdit ? 'Edit flashcard' : 'Add flashcard'}
    >
      <div className="max-h-[80vh] w-full overflow-auto p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-(--ink) text-(--surface)">
            <Plus size={16} aria-hidden="true" />
          </span>

          <div>
            <h3 className="text-[17px] font-semibold">
              {isEdit ? 'Edit flashcard' : 'Add flashcard'}
            </h3>

            <p className="mt-1 text-sm text-(--ink-soft)">
              A retrieval prompt tied to a concept in this Learning
              Space.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="text-sm">
            <span className="font-medium">Concept</span>

            <select
              value={conceptId}
              onChange={(event) => setConceptId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) px-3 py-2.5 text-sm outline-none focus:border-(--veridian) focus:ring-2 focus:ring-(--veridian)/20"
            >
              {concepts.map((concept) => (
                <option key={concept.id} value={concept.id}>
                  {concept.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium">Front</span>

            <textarea
              value={front}
              onChange={(event) => {
                setFront(event.target.value)
                setError(null)
              }}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) p-3 text-[15px] outline-none focus:border-(--veridian) focus:ring-2 focus:ring-(--veridian)/20"
              placeholder="The prompt shown first"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">Back</span>

            <textarea
              value={back}
              onChange={(event) => {
                setBack(event.target.value)
                setError(null)
              }}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) p-3 text-[15px] outline-none focus:border-(--veridian) focus:ring-2 focus:ring-(--veridian)/20"
              placeholder="The answer revealed after recall"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="font-medium">Difficulty</span>

              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as FlashcardDifficulty)
                }
                className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) px-3 py-2.5 text-sm outline-none focus:border-(--veridian) focus:ring-2 focus:ring-(--veridian)/20"
              >
                {DIFFICULTIES.map((value) => (
                  <option key={value} value={value}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="font-medium">
                Source material
                <span className="font-normal text-(--ink-soft)">
                  {' '}
                  (optional)
                </span>
              </span>

              <select
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) px-3 py-2.5 text-sm outline-none focus:border-(--veridian) focus:ring-2 focus:ring-(--veridian)/20"
              >
                <option value="">None</option>

                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.title}
                  </option>
                ))}
              </select>
            </label>
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
            disabled={isPending}
            className="btn-ghost"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={isPending || !conceptId}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Saving…' : isEdit ? 'Save' : 'Add flashcard'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
