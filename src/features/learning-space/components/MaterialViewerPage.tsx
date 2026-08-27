import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  FileImage,
  FileText,
  FileType2,
  Layers,
  NotebookPen,
  Sparkles,
} from 'lucide-react'

import type {
  Concept,
  MaterialType,
} from '#/features/learning-space/domain/learningSpace'
import { useMaterial } from '../hooks/useMaterial'
import { useLearningSpaceDetail } from '#/features/learning-space/hooks/useLearningSpaceDetail'
import { useConcepts } from '#/features/learning-space/hooks/useConcepts'
import { TutorPanel } from './TutorPanel'

type Mode = 'read' | 'explore' | 'ask' | 'review'

const MODES: { id: Mode; label: string; icon: typeof BookOpen }[] = [
  { id: 'read', label: 'Read', icon: BookOpen },
  { id: 'explore', label: 'Explore', icon: Layers },
  { id: 'ask', label: 'Ask', icon: Sparkles },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function materialIcon(type: MaterialType) {
  switch (type) {
    case 'pdf':
      return FileType2
    case 'image':
      return FileImage
    default:
      return FileText
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting processing',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Could not process',
}

export function MaterialViewerPage({ materialId }: { materialId: string }) {
  const { material, ready } = useMaterial(materialId)
  const learningSpaceId = material?.learningSpaceId ?? ''
  const { learningSpace } = useLearningSpaceDetail(learningSpaceId)
  const { concepts } = useConcepts(learningSpaceId)
  const [mode, setMode] = useState<Mode>('read')

  if (!ready) {
    return (
      <div className="page-wrap py-10">
        <p className="mono-label">Loading material…</p>
      </div>
    )
  }

  if (!material) {
    return (
      <div className="page-wrap py-10">
        <p className="mono-label text-(--destructive)">Material not found</p>
        <Link to="/learning-spaces" className="btn-ghost mt-4">
          Back to Learning Spaces
        </Link>
      </div>
    )
  }

  const Icon = materialIcon(material.type)
  const associatedConcepts: Concept[] = concepts.filter((concept) =>
    concept.materialIds.includes(material.id),
  )

  return (
    <div className="page-wrap py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-(--ink-faint)">
        <Link
          to="/learning-spaces"
          className="transition hover:text-(--ink)"
        >
          Learning Spaces
        </Link>
        <span aria-hidden="true">/</span>
        {learningSpace && (
          <>
            <Link
              to="/learning-spaces/$learningSpaceId"
              params={{ learningSpaceId: learningSpace.id }}
              className="transition hover:text-(--ink)"
            >
              {learningSpace.title}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span className="text-(--ink)">{material.title}</span>
      </nav>

      <header className="mb-6">
        <Link
          to="/learning-spaces/$learningSpaceId"
          params={{ learningSpaceId: material.learningSpaceId }}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-(--ink-faint) transition hover:text-(--ink)"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to space
        </Link>

        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-(--surface-muted) text-(--blue)">
            <Icon size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-(--ink)">
              {material.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="chip">{material.type.toUpperCase()}</span>
              <span className="chip chip-live">
                {STATUS_LABELS[material.extractionStatus] ??
                  material.extractionStatus}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <section className="card-flat p-4">
            <p className="mono-label">Source</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-(--ink-faint)">File</dt>
                <dd className="truncate text-(--ink)">
                  {material.source.fileName}
                </dd>
              </div>
              <div>
                <dt className="text-(--ink-faint)">Size</dt>
                <dd className="text-(--ink)">
                  {formatBytes(material.source.sizeBytes)}
                </dd>
              </div>
              <div>
                <dt className="text-(--ink-faint)">Added</dt>
                <dd className="text-(--ink)">
                  {new Date(material.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card-flat p-4">
            <p className="mono-label">Sections</p>
            <p className="mt-2 text-sm text-(--ink-faint)">
              Sections aren't extracted for this material yet.
            </p>
          </section>
        </aside>

        <section className="card-flat overflow-hidden">
          <div
            role="tablist"
            aria-label="Material view"
            className="flex border-b border-(--line)"
          >
            {MODES.map((tab) => {
              const TabIcon = tab.icon
              const active = mode === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(tab.id)}
                  className={
                    'flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition ' +
                    (active
                      ? 'border-b-2 border-(--blue) text-(--ink)'
                      : 'text-(--ink-faint) hover:text-(--ink)')
                  }
                >
                  <TabIcon size={16} aria-hidden="true" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-5">
            {mode === 'read' && (
              <div className="prose-reader">
                <h2 className="text-lg font-semibold text-(--ink)">
                  {material.title}
                </h2>
                <p className="mt-3 text-sm text-(--ink-soft)">
                  Readable source content isn't stored on this device yet, so
                  there's nothing to display here. When content is available, it
                  will appear in this reader and you'll be able to select text to
                  capture highlights, concepts and flashcards.
                </p>
              </div>
            )}

            {mode === 'explore' && (
              <div>
                <p className="mono-label">Concepts from this material</p>
                {associatedConcepts.length === 0 ? (
                  <p className="mt-3 text-sm text-(--ink-faint)">
                    No concepts are linked to this material yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {associatedConcepts.map((concept) => (
                      <li
                        key={concept.id}
                        className="rounded-xl border border-(--line) bg-(--surface) p-3"
                      >
                        <p className="font-medium text-(--ink)">
                          {concept.name}
                        </p>
                        {concept.description && (
                          <p className="mt-1 text-sm text-(--ink-soft)">
                            {concept.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {mode === 'ask' && <TutorPanel materialTitle={material.title} />}

            {mode === 'review' && (
              <div>
                <p className="mono-label">Review &amp; practice</p>
                <p className="mt-2 text-sm text-(--ink-soft)">
                  Tie review to this material's concepts.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Link
                    to="/review"
                    className="card-flat flex flex-col gap-1 p-4 transition hover:border-(--blue)"
                  >
                    <ClipboardCheck
                      size={18}
                      className="text-(--blue)"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-(--ink)">
                      Start review
                    </span>
                  </Link>
                  <Link
                    to="/flashcards"
                    className="card-flat flex flex-col gap-1 p-4 transition hover:border-(--blue)"
                  >
                    <NotebookPen
                      size={18}
                      className="text-(--blue)"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-(--ink)">
                      Flashcards
                    </span>
                  </Link>
                  <Link
                    to="/learning-spaces/$learningSpaceId"
                    params={{ learningSpaceId: material.learningSpaceId }}
                    className="card-flat flex flex-col gap-1 p-4 transition hover:border-(--blue)"
                  >
                    <Layers
                      size={18}
                      className="text-(--blue)"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-(--ink)">Quiz</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card-flat p-4">
            <p className="mono-label">Context</p>
            <p className="mt-2 text-sm text-(--ink-soft)">
              The AI Tutor will ground its answers in your concepts, highlights
              and review history for this material.
            </p>
          </section>

          <section className="card-flat p-4">
            <p className="mono-label">Concepts</p>
            {associatedConcepts.length === 0 ? (
              <p className="mt-2 text-sm text-(--ink-faint)">
                No concepts linked yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {associatedConcepts.map((concept) => (
                  <li key={concept.id} className="text-sm text-(--ink-soft)">
                    {concept.name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
