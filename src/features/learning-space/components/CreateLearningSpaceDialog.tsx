import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'

import { Dialog } from '#/shared/components/ui/Dialog'
import { createLearningSpace } from '../application/createLearningSpace'

type CreateLearningSpaceDialogProps = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateLearningSpaceDialog({
  open,
  onClose,
  onCreated,
}: CreateLearningSpaceDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  const save = () => {
    if (!title.trim()) {
      return
    }

    startTransition(async () => {
      await createLearningSpace({
        title,
        description: description.trim() ? description : undefined,
      })

      onCreated()
      onClose()
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="New learning space"
    >
      <div className="max-h-[80vh] w-full overflow-auto p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-(--ink) text-(--surface)">
            <Plus size={16} aria-hidden="true" />
          </span>

          <div>
            <h3 className="text-[17px] font-semibold">
              Create a learning space
            </h3>

            <p className="mt-1 text-sm text-(--ink-soft)">
              Give it a name for the subject or lesson you&rsquo;re bringing
              together. You can add materials once it&rsquo;s created.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="text-sm">
            <span className="font-medium">Name</span>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded-full border border-(--line) bg-(--surface) px-3.5 py-2.5 text-sm outline-none focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/20"
              placeholder="e.g. Cellular respiration…"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">Description</span>
            <span className="font-normal text-(--ink-faint)">
              {' '}
              (optional)
            </span>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) p-3 text-[15px] outline-none focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/20"
              placeholder="What this space is for"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="btn-ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>

          <button
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            onClick={save}
            disabled={!title.trim() || isPending}
          >
            {isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}