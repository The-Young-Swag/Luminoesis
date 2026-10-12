import { useState } from 'react'
import { Upload, X } from 'lucide-react'

import { createMaterial } from '../application/createMaterial'
import { Dialog } from '#/shared/components/ui/Dialog'
import { processMaterialExtraction } from '../application/materialExtraction'
import { saveMaterialFile } from '../application/saveMaterialFile'

type AddMaterialDialogProps = {
  learningSpaceId: string
  open: boolean
  onCreated: () => void
  onClose: () => void
}

const ACCEPTED_FILES =
  '.pdf,.docx,.png,.jpg,.jpeg,.pptx,.txt,.md,.markdown'

function getMaterialType(
  fileName: string,
):
  | 'pdf'
  | 'image'
  | 'pptx'
  | 'docx'
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

    case 'docx':
      return 'docx'

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
  open,
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
      const material = await createMaterial({
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

      // Persist the original file so the Read pane can show a faithful
      // preview after reload. Best-effort: if this fails, extraction still
      // runs and the Read pane falls back to extracted text.
      try {
        await saveMaterialFile(material.id, file)
      } catch (persistError) {
        console.warn('[material] failed to persist original file for preview', persistError)
      }

      // Real extraction — never fabricate. For text/markdown this is instant;
      // for pdf/docx/image it may take a moment.
      try {
        await processMaterialExtraction(file, material)
      } catch (extractionError) {
        const message =
          extractionError instanceof Error ? extractionError.message : String(extractionError)
        setError(message)
        // Material already created; keep it so user can add content manually.
        // Refresh list so the new material appears with its final status.
        onCreated()
        return
      }

      onCreated()
      onClose()
    } catch {
      setError('The material could not be added.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="add-material-title"
      label="Add material"
    >
      <div className="max-h-[80vh] w-full overflow-auto p-6 sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-material-title"
              className="text-lg font-semibold text-(--ink)"
            >
              Add material
            </h2>

            <p className="mt-1.5 text-sm text-(--ink-soft)">
              Add a file to this Learning Space.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-(--line-strong) px-8 py-14 text-center transition hover:border-(--ink-faint)"
        >
          <Upload
            size={26}
            className="mb-4 text-(--ink-soft)"
            aria-hidden="true"
          />

          <span className="text-sm font-medium text-(--ink)">
            {file ? file.name : 'Choose a file'}
          </span>

          <span className="mt-1.5 text-xs text-(--ink-soft)">
            PDF, Word, image, PPTX, TXT, or Markdown
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
          <p className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-ghost disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!file || saving}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add material'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}