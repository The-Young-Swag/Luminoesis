import { useState } from 'react'
import { Upload, X } from 'lucide-react'

import { createMaterial } from '../application/createMaterial'

type AddMaterialDialogProps = {
  learningSpaceId: string
  onCreated: () => void
  onClose: () => void
}

const ACCEPTED_FILES =
  '.pdf,.png,.jpg,.jpeg,.pptx,.txt,.md,.markdown'

function getMaterialType(
  fileName: string,
):
  | 'pdf'
  | 'image'
  | 'pptx'
  | 'text'
  | 'markdown'
  | undefined {
  const extension =
    fileName.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'pdf':
      return 'pdf'

    case 'png':
    case 'jpg':
    case 'jpeg':
      return 'image'

    case 'pptx':
      return 'pptx'

    case 'txt':
      return 'text'

    case 'md':
    case 'markdown':
      return 'markdown'

    default:
      return undefined
  }
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').trim()
}

export function AddMaterialDialog({
  learningSpaceId,
  onCreated,
  onClose,
}: AddMaterialDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!file) {
      setError('Choose a file first.')
      return
    }

    const type = getMaterialType(file.name)

    if (!type) {
      setError('This file type is not supported.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await createMaterial({
        learningSpaceId,
        title: titleFromFileName(file.name),
        type,
        source: {
          kind: 'local-file',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        },
      })

      onCreated()
      onClose()
    } catch {
      setError('The material could not be added.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-material-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-material-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Add material
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Add a file to this Learning Space.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center transition hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500"
        >
          <Upload
            size={24}
            className="mb-3 text-zinc-500"
            aria-hidden="true"
          />

          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {file ? file.name : 'Choose a file'}
          </span>

          <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            PDF, image, PPTX, TXT, or Markdown
          </span>

          <input
            type="file"
            accept={ACCEPTED_FILES}
            className="sr-only"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null
              setFile(nextFile)
              setError(null)
            }}
          />
        </label>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!file || saving}
            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {saving ? 'Adding…' : 'Add material'}
          </button>
        </div>
      </div>
    </div>
  )
}
