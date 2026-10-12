import { ArrowLeft, FileText, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { AddMaterialDialog } from './AddMaterialDialog'
import { ConceptsSection } from './ConceptsSection'
import { FlashcardsSection } from '#/features/flashcard/components/FlashcardsSection'
import { QuizSection } from '#/features/quiz/components/QuizSection'
import { BrainTrainerSection } from '#/features/brain-trainer/components/BrainTrainerSection'
import { useLearningSpaceDetail } from '../hooks/useLearningSpaceDetail'
import { useMaterials } from '../hooks/useMaterials'
import { useConcepts } from '../hooks/useConcepts'
import { SectionHeader } from '#/shared/components/ui/SectionHeader'
import { EmptyState } from '#/shared/components/ui/EmptyState'

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

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TAB_IDS = ['all', 'materials', 'concepts', 'flashcards', 'practice', 'brain-trainer'] as const
type TabId = (typeof TAB_IDS)[number]

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'materials', label: 'Materials' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'practice', label: 'Practice' },
  { id: 'brain-trainer', label: 'Brain Trainer' },
]

function isTabId(value: string): value is TabId {
  return (TAB_IDS as readonly string[]).includes(value)
}

/**
 * Tab state lives in the URL hash rather than plain component state, so a
 * link to "#flashcards" opens straight into that view and the browser's
 * back button steps between tabs the person actually visited. Reading the
 * hash is deferred to an effect (rather than done in the initial useState)
 * so server and first client render both start from "all" and stay in sync
 * for hydration.
 */
function useWorkspaceTab(): readonly [TabId, (next: TabId) => void] {
  const [tab, setTab] = useState<TabId>('all')

  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '')
    if (isTabId(fromHash)) {
      setTab(fromHash)
    }

    function onHashChange() {
      const next = window.location.hash.replace('#', '')
      setTab(isTabId(next) ? next : 'all')
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const changeTab = useCallback((next: TabId) => {
    setTab(next)
    const { pathname, search } = window.location
    const target = next === 'all' ? pathname + search : `${pathname}${search}#${next}`
    window.history.pushState(null, '', target)
  }, [])

  return [tab, changeTab] as const
}

export function LearningSpaceWorkspacePage({
  learningSpaceId,
}: Lear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8) {
  const { learningSpace, ready: spaceReady } = useLearningSpaceDetail(learningSpaceId)
  const { materials, ready: materialsReady, refresh } = useMaterials(learningSpaceId)
  const { concepts, ready: conceptsReady } = useConcepts(learningSpaceId)

  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [activeTab, setActiveTab] = useWorkspaceTab()

  const ready = spaceReady && materialsReady && conceptsReady

  if (!ready) {
    return (
      <main className="page-wrap py-10" aria-busy="true">
        <span className="sr-only">Loading learning space…</span>

        <div className="skeleton h-4 w-24" />
        <div className="skeleton mt-8 h-9 w-72" />
        <div className="skeleton mt-3 h-4 w-96 max-w-full" />
        <div className="skeleton mt-10 h-12 w-full max-w-xl rounded-2xl" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      </main>
    )
  }

  if (!learningSpace) {
    return (
      <main className="page-wrap py-10">
        <Link to="/learning-spaces" className="nav-link inline-flex items-center gap-2">
          <ArrowLeft size={16} aria-hidden="true" />
          Learning Spaces
        </Link>

        <div className="rise mt-14">
          <EmptyState
            icon={FileText}
            title="Learning Space not found"
            description="This Learning Space may have been removed."
          />
        </div>
      </main>
    )
  }

  const sections: { id: Exclude<TabId, 'all'>; node: ReactNode }[] = [
    {
      id: 'materials',
      node: (
        <MaterialsSection
          materials={materials}
          onAddMaterial={() => setShowAddMaterial(true)}
        />
      ),
    },
    {
      id: 'concepts',
      node: (
        <ConceptsSection
          learningSpaceId={learningSpaceId}
          concepts={concepts}
          materials={materials}
        />
      ),
    },
    {
      id: 'flashcards',
      node: <FlashcardsSection learningSpaceId={learningSpaceId} concepts={concepts} materials={materials} />,
    },
    {
      id: 'practice',
      node: <QuizSection learningSpaceId={learningSpaceId} concepts={concepts} />,
    },
    {
      id: 'brain-trainer',
      node: <BrainTrainerSection concepts={concepts} />,
    },
  ]

  const visibleSections =
    activeTab === 'all' ? sections : sections.filter((section) => section.id === activeTab)

  return (
    <main className="page-wrap py-10">
      <Link to="/learning-spaces" className="nav-link inline-flex items-center gap-2">
        <ArrowLeft size={16} aria-hidden="true" />
        Learning Spaces
      </Link>

      <header className="mt-8">
        <p className="eyebrow">Learning Space</p>

        <h1 className="display mt-2.5 text-3xl tracking-tight">{learningSpace.title}</h1>

        {learningSpace.description && (
          <p className="mt-2.5 max-w-2xl text-sm leading-6 text-(--ink-soft)">
            {learningSpace.description}
          </p>
        )}
      </header>

      <WorkspaceTabs
        active={activeTab}
        onChange={setActiveTab}
        counts={{ materials: materials.length, concepts: concepts.length }}
      />

      <div key={activeTab} className="rise mt-10 flex flex-col gap-20">
        {visibleSections.map((section) => (
          <div key={section.id}>{section.node}</div>
        ))}
      </div>

      <AddMaterialDialog
        open={showAddMaterial}
        learningSpaceId={learningSpaceId}
        onCreated={refresh}
        onClose={() => setShowAddMaterial(false)}
      />
    </main>
  )
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

function WorkspaceTabs({
  active,
  onChange,
  counts,
}: {
  active: TabId
  onChange: (tab: TabId) => void
  counts: Partial<Record<TabId, number>>
}) {
  return (
    <div
      role="tablist"
      aria-label="Workspace section"
      className="mt-8 flex items-center gap-1 overflow-x-auto rounded-2xl bg-(--surface-muted) p-1.5"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id
        const count = counts[tab.id]

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cx(
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-(--surface) text-(--ink) shadow-sm'
                : 'text-(--ink-soft) hover:text-(--ink)',
            )}
          >
            {tab.label}
            {typeof count === 'number' && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                  isActive ? 'bg-(--blue)/12 text-(--blue)' : 'bg-(--surface) text-(--ink-soft)',
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

type MaterialsSectionProps = {
  materials: {
    id: string
    title: string
    type: string
    extractionStatus: string
    source: { fileName: string; sizeBytes: number }
  }[]
  onAddMaterial: () => void
}

function MaterialsSection({ materials, onAddMaterial }: MaterialsSectionProps) {
  return (
    <section>
      <SectionHeader
        title="Materials"
        description="Source material for this Learning Space."
        meta={
          materials.length > 0
            ? `${materials.length} ${materials.length === 1 ? 'material' : 'materials'}`
            : undefined
        }
        action={
          <button
            type="button"
            onClick={onAddMaterial}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} aria-hidden="true" />
            Add material
          </button>
        }
      />

      {materials.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No materials yet"
          description="Add lecture notes, PDFs, slides, or other study material to begin building this Learning Space."
          action={
            <button type="button" onClick={onAddMaterial} className="btn-primary">
              <Plus size={16} aria-hidden="true" />
              Add material
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => (
            <Link
              key={material.id}
              to="/material/$materialId"
              params={{ materialId: material.id }}
              className="card-flat group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-(--blue)/30"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--surface-muted) text-(--blue)">
                  <FileText size={19} aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-(--ink)">
                    {material.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-(--ink-soft)">
                    {material.source.fileName}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-1 flex-wrap items-center gap-2 text-xs">
                <span className="chip">{materialTypeLabel(material.type)}</span>
                <span className="text-(--ink-soft)">
                  {formatBytes(material.source.sizeBytes)}
                </span>
              </div>

              <div className="mt-5 border-t border-(--line) pt-4">
                <span className="text-xs text-(--ink-soft)">
                  Status:{' '}
                  <span className="font-medium text-(--ink)">
                    {material.extractionStatus === 'ready'
                      ? 'Ready'
                      : material.extractionStatus === 'failed'
                        ? 'Needs attention'
                        : 'Extracting…'}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}