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
import type {
  MaterialContentBlock,
} from '#/features/learning-space/domain/materialContent'
import { useMaterial } from '../hooks/useMaterial'
import { useLearningSpaceDetail } from '#/features/learning-space/hooks/useLearningSpaceDetail'
import { useConcepts } from '#/features/learning-space/hooks/useConcepts'
import { useMaterialContent } from '../hooks/useMaterialContent'
import { saveMaterialContent } from '#/features/learning-space/application/saveMaterialContent'
import { TutorPanel } from './TutorPanel'

function parseDraft(draft: string): MaterialContentBlock[] {
  return draft
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.startsWith('# ')) {
        return {
          id: crypto.randomUUID(),
          type: 'heading' as const,
          text: line.slice(2),
        }
      }

      return {
        id: crypto.randomUUID(),
        type: 'paragraph' as const,
        text: line,
      }
    })
}

function serializeDraft(blocks: MaterialContentBlock[]): string {
  return blocks
    .map((block) =>
      block.type === 'heading' ? `# ${block.text}` : block.text,
    )
    .join('\n')
}

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
  const { content } = useMaterialContent(materialId)
  const [mode, setMode] = useState<Mode>('read')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const hasContent = !!content && content.blocks.length > 0

  async function saveContent() {
    if (!material) {
      return
    }

    setSaving(true)

    try {
      await saveMaterialContent({
        materialId: material.id,
        source: 'user',
        blocks: parseDraft(draft),
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function startEditing() {
    setDraft(content ? serializeDraft(content.blocks) : '')
    setEditing(true)
  }

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
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-(--ink)">
                    {material.title}
                  </h2>
                  {!editing && (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="btn-ghost shrink-0"
                    >
                      {hasContent ? 'Edit content' : 'Add content'}
                    </button>
                  )}
                </div>

                {editing ? (
                  <div>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={12}
                      placeholder="Paste or write the material's readable text here. Lines starting with '# ' become headings."
                      className="w-full resize-y rounded-xl border border-(--line) bg-(--surface) p-3 text-sm text-(--ink) outline-none transition focus:border-(--blue)"
                    />
                    <div className="mt-3 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        disabled={saving}
                        className="btn-ghost disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveContent()}
                        disabled={saving || draft.trim().length === 0}
                        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save content'}
                      </button>
                    </div>
                  </div>
                ) : content && content.blocks.length > 0 ? (
                  <article
                    id="reader-content"
                    className="prose-reader space-y-3"
                  >
                    {content.blocks.map((block) =>
                      block.type === 'heading' ? (
                        <h3
                          key={block.id}
                          className="text-base font-semibold text-(--ink)"
                        >
                          {block.text}
                        </h3>
                      ) : (
                        <p
                          key={block.id}
                          className="text-sm leading-relaxed text-(--ink-soft)"
                        >
                          {block.text}
                        </p>
                      ),
                    )}
                  </article>
                ) : (
                  <div className="rounded-xl border border-dashed border-(--line-strong) p-6 text-center">
                    <p className="text-sm text-(--ink-soft)">
                      No readable content yet. Add the material's text here, or it
                      will be filled automatically when extraction is available.
                    </p>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="btn-primary mt-4"
                    >
                      Add content
                    </button>
                  </div>
                )}
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
