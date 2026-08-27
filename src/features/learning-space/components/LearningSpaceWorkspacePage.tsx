import { ArrowLeft, FileText, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { AddMaterialDialog } from './AddMaterialDialog'
import { ConceptsSection } from './ConceptsSection'
import { FlashcardsSection } from '#/features/flashcard/components/FlashcardsSection'
import { QuizSection } from '#/features/quiz/components/QuizSection'
import { BrainTrainerSection } from '#/features/brain-trainer/components/BrainTrainerSection'
import { useLearningSpaceDetail } from '../hooks/useLearningSpaceDetail'
import { useMaterials } from '../hooks/useMaterials'
import { useConcepts } from '../hooks/useConcepts'

type LearningSpaceWorkspacePageProps = {
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
}: LearningSpaceWorkspacePageProps) {
  const { learningSpace, ready: spaceReady } =
    useLearningSpaceDetail(learningSpaceId)

  const { materials, ready: materialsReady } =
    useMaterials(learningSpaceId)

  const { concepts, ready: conceptsReady } =
    useConcepts(learningSpaceId)

  const [showAddMaterial, setShowAddMaterial] = useState(false)

  const ready = spaceReady && materialsReady && conceptsReady

  if (!ready) {
    return (
      <main className="page-wrap py-8" aria-busy="true">
        <span className="sr-only">Loading learning space…</span>

        <div className="skeleton h-4 w-24" />
        <div className="skeleton mt-6 h-8 w-72" />
        <div className="skeleton mt-3 h-4 w-96 max-w-full" />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </main>
    )
  }

  if (!learningSpace) {
    return (
      <main className="page-wrap py-8">
        <Link
          to="/learning-spaces"
          className="nav-link inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Learning Spaces
        </Link>

        <div className="card-flat rise mt-12 p-10 text-center">
          <h1 className="display text-xl">Learning Space not found</h1>

          <p className="mt-2 text-sm text-(--ink-soft)">
            This Learning Space may have been removed.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap py-8">
      <Link
        to="/learning-spaces"
        className="nav-link inline-flex items-center gap-2"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Learning Spaces
      </Link>

      <header className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Learning Space</p>

          <h1 className="display mt-2 text-3xl tracking-tight">
            {learningSpace.title}
          </h1>

          {learningSpace.description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ink-soft)">
              {learningSpace.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAddMaterial(true)}
          className="btn-primary inline-flex shrink-0 items-center justify-center gap-2"
        >
          <Plus size={16} aria-hidden="true" />
          Add material
        </button>
      </header>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="display text-xl">Materials</h2>

            <p className="mt-1 text-sm text-(--ink-soft)">
              Source material for this Learning Space.
            </p>
          </div>

          {materials.length > 0 && (
            <span className="text-xs text-(--ink-faint)">
              {materials.length}{' '}
              {materials.length === 1 ? 'material' : 'materials'}
            </span>
          )}
        </div>

        {materials.length === 0 ? (
          <div className="card-flat rise p-10 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-(--surface-muted) text-(--ink-soft)">
              <FileText size={20} aria-hidden="true" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-(--ink)">
              No materials yet
            </h3>

            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-(--ink-soft)">
              Add lecture notes, PDFs, slides, or other study material
              to begin building this Learning Space.
            </p>

            <button
              type="button"
              onClick={() => setShowAddMaterial(true)}
              className="btn-primary mt-5"
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
                className="card-flat group flex flex-col p-5 transition hover:border-(--blue)/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--surface-muted) text-(--ink-soft)">
                      <FileText size={18} aria-hidden="true" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-(--ink)">
                        {material.title}
                      </h3>

                      <p className="mt-1 truncate text-xs text-(--ink-faint)">
                        {material.source.fileName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip">
                    {materialTypeLabel(material.type)}
                  </span>

                  <span className="text-(--ink-faint)">
                    {formatBytes(material.source.sizeBytes)}
                  </span>
                </div>

                <div className="mt-4 border-t border-(--line) pt-4">
                  <span className="text-xs text-(--ink-soft)">
                    Status:{' '}
                    <span className="font-medium text-(--ink)">
                      {material.extractionStatus}
                    </span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ConceptsSection
        learningSpaceId={learningSpaceId}
        concepts={concepts}
        materials={materials}
      />

      <FlashcardsSection concepts={concepts} materials={materials} />

      <QuizSection learningSpaceId={learningSpaceId} concepts={concepts} />

      <BrainTrainerSection concepts={concepts} />

      {showAddMaterial && (
        <AddMaterialDialog
          learningSpaceId={learningSpaceId}
          onCreated={() => undefined}
          onClose={() => setShowAddMaterial(false)}
        />
      )}
    </main>
  )
}
