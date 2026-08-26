import { ArrowLeft, FileText, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { AddMaterialDialog } from './AddMaterialDialog'
import { useLearningSpaceDetail } from '../hooks/useLearningSpaceDetail'
import { useMaterials } from '../hooks/useMaterials'

type Lear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8 = {
  learningSpaceId: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function materialTypeLabel(type: string) {
  switch (type) {
    case 'pdf':
      return 'PDF'

    case 'image':
      return 'Image'

    case 'pptx':
      return 'PowerPoint'

    case 'text':
      return 'Text'

    case 'markdown':
      return 'Markdown'

    default:
      return type
  }
}

export function LearningSpaceWorkspacePage({
  learningSpaceId,
}: Lear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8) {
  const { learningSpace, ready: spaceReady } =
    useLearningSpaceDetail(learningSpaceId)

  const {
    materials,
    ready: materialsReady,
    refresh,
  } = useMaterials(learningSpaceId)

  const [showAddMaterial, setShowAddMaterial] = useState(false)

  const ready = spaceReady && materialsReady

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="animate-pulse">
          <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-6 h-8 w-72 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </main>
    )
  }

  if (!learningSpace) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Link
          to="/learning-spaces"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Learning Spaces
        </Link>

        <div className="mt-12 rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Learning Space not found
          </h1>

          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            This Learning Space may have been removed.
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Link
          to="/learning-spaces"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Learning Spaces
        </Link>

        <header className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Learning Space
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {learningSpace.title}
            </h1>

            {learningSpace.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {learningSpace.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAddMaterial(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <Plus size={16} aria-hidden="true" />
            Add material
          </button>
        </header>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Materials
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Source material for this Learning Space.
              </p>
            </div>

            {materials.length > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {materials.length}{' '}
                {materials.length === 1 ? 'material' : 'materials'}
              </span>
            )}
          </div>

          {materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-950">
              <FileText
                size={28}
                className="mx-auto text-zinc-400 dark:text-zinc-500"
                aria-hidden="true"
              />

              <h3 className="mt-4 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                No materials yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Add lecture notes, PDFs, slides, or other study material to
                begin building this Learning Space.
              </p>

              <button
                type="button"
                onClick={() => setShowAddMaterial(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <Plus size={16} aria-hidden="true" />
                Add material
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {materials.map((material) => (
                <article
                  key={material.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                        <FileText size={18} aria-hidden="true" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {material.title}
                        </h3>

                        <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {material.source.fileName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                      {materialTypeLabel(material.type)}
                    </span>

                    <span className="text-zinc-400 dark:text-zinc-500">
                      {formatBytes(material.source.sizeBytes)}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-900">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Status:{' '}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {material.extractionStatus}
                      </span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {showAddMaterial && (
        <AddMaterialDialog
          learningSpaceId={learningSpaceId}
          onCreated={() => void refresh()}
          onClose={() => setShowAddMaterial(false)}
        />
      )}
    </>
  )
}
