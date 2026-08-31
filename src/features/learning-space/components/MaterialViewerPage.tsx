import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  FileImage,
  FileText,
  FileType2,
  Layers,
  Maximize2,
  Minimize2,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type {
  Concept,
  MaterialType,
} from '#/features/learning-space/domain/learningSpace'
import type {
  MaterialContent,
  MaterialContentBlock,
} from '#/features/learning-space/domain/materialContent'
import { useMaterial } from '../hooks/useMaterial'
import { useLearningSpaceDetail } from '#/features/learning-space/hooks/useLearningSpaceDetail'
import { useConcepts } from '#/features/learning-space/hooks/useConcepts'
import { useMaterials } from '../hooks/useMaterials'
import { useMaterialContent } from '../hooks/useMaterialContent'
import { useConceptsMastery } from '../hooks/useConceptsMastery'
import { saveMaterialContent } from '#/features/learning-space/application/saveMaterialContent'
import { createHighlight } from '#/features/learning-space/application/createHighlight'
import { TutorPanel } from './TutorPanel'
import type { TutorPanelHandle } from './TutorPanel'
import { SelectionBubble } from './SelectionBubble'
import type { ReaderSelection } from './SelectionBubble'
import { AddConceptDialog } from './AddConceptDialog'
import { AddFlashcardDialog } from '#/features/flashcard/components/AddFlashcardDialog'
import { AddQuestionDialog } from '#/features/quiz/components/AddQuestionDialog'

/** Joins truthy class names — keeps conditional className lists readable. */
function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * A boolean that survives reloads via localStorage, without fighting SSR.
 * The first render (server and client) always uses `initial`; once mounted,
 * it syncs from storage. This avoids hydration mismatches at the cost of a
 * harmless one-frame flash if the stored preference differs from the default.
 */
function usePersistentBoolean(
  key: string,
  initial: boolean,
): readonly [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(initial)
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) {
        setValue(stored === '1')
      }
    } catch {
      // Storage may be unavailable (private browsing, etc.) — fall back silently.
    }
    hydrated.current = true
  }, [key])

  useEffect(() => {
    if (!hydrated.current) {
      return
    }
    try {
      window.localStorage.setItem(key, value ? '1' : '0')
    } catch {
      // Ignore write failures — collapse state just won't persist.
    }
  }, [key, value])

  return [value, setValue] as const
}

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
type PaneMode = Exclude<Mode, 'ask'>

const MODES: { id: Mode; label: string; icon: LucideIcon }[] = [
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

function materialIcon(type: MaterialType): LucideIcon {
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
  const { materials } = useMaterials(learningSpaceId)

  const [selection, setSelection] = useState<ReaderSelection | null>(null)
  const [tutorContext, setTutorContext] = useState<string | undefined>()
  const [showConcept, setShowConcept] = useState(false)
  const [showFlashcard, setShowFlashcard] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [pendingText, setPendingText] = useState<string | undefined>()
  const readerRef = useRef<HTMLElement>(null)
  const tutorRef = useRef<TutorPanelHandle>(null)

  // `mode` drives which top tab is highlighted; `paneMode` drives what the
  // center reading pane shows. They're split so that selecting "Ask" simply
  // brings focus to the always-visible tutor in the sidebar rather than
  // replacing the reading surface — matching how the tutor stays put
  // alongside whatever you're doing in the mockup.
  const [mode, setMode] = useState<Mode>('read')
  const [paneMode, setPaneMode] = useState<PaneMode>('read')

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const [leftCollapsed, setLeftCollapsed] = usePersistentBoolean(
    'material-viewer:rail-collapsed',
    false,
  )
  const [rightCollapsed, setRightCollapsed] = usePersistentBoolean(
    'material-viewer:panel-collapsed',
    false,
  )
  const focused = leftCollapsed && rightCollapsed

  const toggleFocusMode = useCallback(() => {
    const next = !focused
    setLeftCollapsed(next)
    setRightCollapsed(next)
  }, [focused, setLeftCollapsed, setRightCollapsed])

  const hasContent = !!content && content.blocks.length > 0

  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) {
        setSelection(null)
        return
      }
      const text = sel.toString().trim()
      if (!text) {
        setSelection(null)
        return
      }
      const anchor = sel.anchorNode
      if (!anchor || !readerRef.current?.contains(anchor.parentElement)) {
        setSelection(null)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelection({
        text,
        rect: {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          width: rect.width,
        },
      })
    }

    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  const associatedConcepts: Concept[] = useMemo(() => {
    if (!material) {
      return []
    }

    return concepts.filter((concept) => concept.materialIds.includes(material.id))
  }, [concepts, material])

  const { masteryById } = useConceptsMastery(associatedConcepts)

  const handleModeChange = useCallback(
    (next: Mode) => {
      setMode(next)

      if (next === 'ask') {
        setRightCollapsed(false)
        // Wait a tick for the panel to expand before focusing it.
        requestAnimationFrame(() => tutorRef.current?.focusInput())
        return
      }

      setPaneMode(next)
    },
    [setRightCollapsed],
  )

  const clearSelection = useCallback(() => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleCreateHighlight = useCallback(
    async (text: string) => {
      if (!material) {
        return
      }

      await createHighlight({
        learningSpaceId: material.learningSpaceId,
        materialId: material.id,
        text,
        locator: { kind: 'text', startOffset: 0, endOffset: text.length },
      })
      clearSelection()
    },
    [material, clearSelection],
  )

  const handleAskTutor = useCallback(
    (text: string) => {
      setTutorContext(text)
      setMode('ask')
      setRightCollapsed(false)
      requestAnimationFrame(() => tutorRef.current?.focusInput())
      clearSelection()
    },
    [clearSelection, setRightCollapsed],
  )

  const handleCreateConcept = useCallback((text: string) => {
    setPendingText(text)
    setShowConcept(true)
    setSelection(null)
  }, [])

  const handleCreateFlashcard = useCallback((text: string) => {
    setPendingText(text)
    setShowFlashcard(true)
    setSelection(null)
  }, [])

  const handleCreateQuiz = useCallback((text: string) => {
    setPendingText(text)
    setShowQuiz(true)
    setSelection(null)
  }, [])

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
      <div className="page-wrap flex min-h-[60vh] items-center justify-center py-10">
        <p className="mono-label text-(--ink-faint)">Loading material…</p>
      </div>
    )
  }

  if (!material) {
    return (
      <div className="page-wrap flex min-h-[60vh] flex-col items-center justify-center gap-4 py-10 text-center">
        <p className="mono-label text-destructive">Material not found</p>
        <Link to="/learning-spaces" className="btn-ghost">
          Back to Learning Spaces
        </Link>
      </div>
    )
  }

  const Icon = materialIcon(material.type)

  return (
    <div className="page-wrap--wide flex flex-col gap-5 py-6 lg:py-8">
      <WorkspaceTopbar
        icon={Icon}
        materialTitle={material.title}
        learningSpace={learningSpace}
        learningSpaceId={material.learningSpaceId}
        type={material.type}
        status={STATUS_LABELS[material.extractionStatus] ?? material.extractionStatus}
        mode={mode}
        onModeChange={handleModeChange}
        focused={focused}
        onToggleFocus={toggleFocusMode}
      />

      <div
        className="viewer-grid relative grid overflow-hidden rounded-2xl border border-(--line)/60 bg-(--surface)/80 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-[grid-template-columns] duration-300 ease-out lg:h-[calc(100vh-9rem)] lg:min-h-[640px]"
        style={
          {
            '--rail-w': leftCollapsed ? '0px' : '220px',
            '--panel-w': rightCollapsed ? '0px' : '360px',
          } as React.CSSProperties
        }
      >
        <WorkspaceRail
          material={material}
          content={content}
          collapsed={leftCollapsed}
          onToggleCollapsed={() => setLeftCollapsed(!leftCollapsed)}
        />

        <section className="relative min-h-0 overflow-y-auto border-t border-(--line)/60 bg-(--surface) lg:border-t-0 lg:border-x">
          {leftCollapsed && (
            <button
              type="button"
              onClick={() => setLeftCollapsed(false)}
              aria-label="Show source panel"
              title="Show source panel"
              className="absolute left-3 top-3 z-10 hidden h-8 w-8 place-items-center rounded-lg border border-(--line) bg-(--surface)/90 text-(--ink-faint) shadow-sm backdrop-blur-md transition hover:text-(--ink) lg:grid"
            >
              <PanelLeftOpen size={14} aria-hidden="true" />
            </button>
          )}
          {rightCollapsed && (
            <button
              type="button"
              onClick={() => setRightCollapsed(false)}
              aria-label="Show tutor panel"
              title="Show tutor panel"
              className="absolute right-3 top-3 z-10 hidden h-8 w-8 place-items-center rounded-lg border border-(--line) bg-(--surface)/90 text-(--ink-faint) shadow-sm backdrop-blur-md transition hover:text-(--ink) lg:grid"
            >
              <PanelRightOpen size={14} aria-hidden="true" />
            </button>
          )}
        <div className={cx('mx-auto px-6 py-8 lg:px-12 lg:py-12', focused ? 'max-w-[720px]' : leftCollapsed || rightCollapsed ? 'max-w-[680px]' : 'max-w-[640px]')}>
            {paneMode === 'read' && (
              <ReadPane
                readerRef={readerRef}
                content={content}
                hasContent={hasContent}
                editing={editing}
                draft={draft}
                saving={saving}
                onDraftChange={setDraft}
                onStartEditing={startEditing}
                onCancelEditing={() => setEditing(false)}
                onSave={() => void saveContent()}
              />
            )}

            {paneMode === 'explore' && <ExplorePane concepts={associatedConcepts} />}

            {paneMode === 'review' && (
              <ReviewPane learningSpaceId={material.learningSpaceId} />
            )}
          </div>

          {selection && (
            <SelectionBubble
              selection={selection}
              onAskTutor={handleAskTutor}
              onCreateHighlight={(text) => void handleCreateHighlight(text)}
              onCreateConcept={handleCreateConcept}
              onCreateFlashcard={handleCreateFlashcard}
              onCreateQuiz={handleCreateQuiz}
              onDismiss={clearSelection}
            />
          )}
        </section>

        <aside className="flex min-h-0 flex-col border-t border-(--line)/60 bg-(--surface)/20 lg:border-t-0">
          {rightCollapsed ? (
            <CollapsedEdge
              label="Tutor & Concepts"
              icon={PanelRightOpen}
              onExpand={() => setRightCollapsed(false)}
            />
          ) : (
            <>
              <div className="min-h-0 flex-[1.7] border-b border-(--line)/60 bg-(--surface)/30">
                <TutorPanel
                  ref={tutorRef}
                  materialTitle={material.title}
                  materialId={material.id}
                  learningSpaceId={material.learningSpaceId}
                  context={tutorContext}
                  headerAction={
                    <button
                      type="button"
                      onClick={() => setRightCollapsed(true)}
                      aria-label="Hide tutor panel"
                      title="Hide tutor panel"
                      className="-mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-(--ink-faint) transition hover:bg-(--surface-muted)/70 hover:text-(--ink)"
                    >
                      <PanelRightClose size={14} aria-hidden="true" />
                    </button>
                  }
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <ConceptsPanel concepts={associatedConcepts} masteryById={masteryById} />
              </div>
            </>
          )}
        </aside>
      </div>

      {showConcept && (
        <AddConceptDialog
          learningSpaceId={material.learningSpaceId}
          materials={materials}
          initialName={pendingText?.slice(0, 80)}
          initialMaterialIds={[material.id]}
          onCreated={() => setShowConcept(false)}
          onClose={() => setShowConcept(false)}
        />
      )}

      {showFlashcard && (
        <AddFlashcardDialog
          concepts={concepts}
          materials={materials}
          initialFront={pendingText}
          initialMaterialId={material.id}
          onCreated={() => setShowFlashcard(false)}
          onClose={() => setShowFlashcard(false)}
        />
      )}

      {showQuiz && (
        <AddQuestionDialog
          concepts={concepts}
          initialPrompt={pendingText}
          initialMaterialId={material.id}
          onCreated={() => setShowQuiz(false)}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Topbar — breadcrumb, mode tabs, status
// ---------------------------------------------------------------------------

type WorkspaceTopbarProps = {
  icon: LucideIcon
  materialTitle: string
  learningSpace: { id: string; title: string } | undefined
  learningSpaceId: string
  type: MaterialType
  status: string
  mode: Mode
  onModeChange: (mode: Mode) => void
  focused: boolean
  onToggleFocus: () => void
}

function WorkspaceTopbar({
  icon: Icon,
  materialTitle,
  learningSpace,
  learningSpaceId,
  type,
  status,
  mode,
  onModeChange,
  focused,
  onToggleFocus,
}: WorkspaceTopbarProps) {
  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-4 rounded-xl border border-(--line)/60 bg-(--surface)/90 px-4 py-3 shadow-sm backdrop-blur-md lg:px-5">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          to="/learning-spaces/$learningSpaceId"
          params={{ learningSpaceId }}
          aria-label="Back to space"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-(--ink-faint) transition hover:bg-(--surface-muted) hover:text-(--ink)"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>

        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-(--surface-muted) text-(--blue)">
          <Icon size={18} aria-hidden="true" />
        </span>

        <div className="min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-[13px] text-(--ink-faint)"
          >
            {learningSpace && (
              <>
                <Link
                  to="/learning-spaces/$learningSpaceId"
                  params={{ learningSpaceId: learningSpace.id }}
                  className="truncate transition hover:text-(--ink)"
                >
                  {learningSpace.title}
                </Link>
                <span aria-hidden="true">›</span>
              </>
            )}
            <span className="truncate font-medium text-(--ink)">{materialTitle}</span>
          </nav>
        </div>
      </div>

      <ModeTabs mode={mode} onChange={onModeChange} />

      <div className="flex shrink-0 items-center gap-3">
        <span className="chip">{type.toUpperCase()}</span>
        <span className="chip chip-live">{status}</span>

        <div className="h-6 w-px bg-(--line)" aria-hidden="true" />

        <button
          type="button"
          onClick={onToggleFocus}
          aria-pressed={focused}
          title={focused ? 'Show panels' : 'Focus mode — hide side panels'}
          className={cx(
            'grid h-9 w-9 place-items-center rounded-xl transition',
            focused
              ? 'bg-(--blue)/12 text-(--blue)'
              : 'text-(--ink-faint) hover:bg-(--surface-muted) hover:text-(--ink)',
          )}
        >
          {focused ? (
            <Minimize2 size={16} aria-hidden="true" />
          ) : (
            <Maximize2 size={16} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Mode switcher
// ---------------------------------------------------------------------------

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Material view"
      className="inline-flex items-center gap-1 rounded-xl border border-(--line)/40 bg-(--surface-muted)/80 p-1 backdrop-blur-sm"
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
            onClick={() => onChange(tab.id)}
            className={cx(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all',
              active
                ? 'bg-(--surface) text-(--ink) shadow-sm'
                : 'text-(--ink-faint) hover:text-(--ink)',
            )}
          >
            <TabIcon size={14} aria-hidden="true" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Left rail — source metadata + sections (mirrors mockup's Contents rail)
// ---------------------------------------------------------------------------

function WorkspaceRail({
  material,
  content,
  collapsed,
  onToggleCollapsed,
}: {
  material: {
    source: { fileName: string; sizeBytes: number }
    createdAt: number
  }
  content: MaterialContent | undefined
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  if (collapsed) {
    return (
      <CollapsedEdge label="Source & contents" icon={PanelLeftOpen} onExpand={onToggleCollapsed} />
    )
  }

  const headings =
    content?.blocks.filter((block) => block.type === 'heading') ?? []
  const hasContents = headings.length > 0

  return (
    <aside className="flex flex-col gap-8 overflow-y-auto bg-(--surface)/40 px-3.5 py-[22px]">
      <div>
        <div className="mb-3 flex items-center gap-3 px-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Hide source panel"
            title="Hide source panel"
            className="-ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-(--ink-faint) transition hover:bg-(--surface-muted)/70 hover:text-(--ink)"
          >
            <PanelLeftClose size={14} aria-hidden="true" />
          </button>

          <span className="h-4 w-px bg-(--ink-faint)/30" aria-hidden="true" />

          <p className="mono-label text-[11px] tracking-[0.08em] text-(--ink-faint)">Source</p>
        </div>

        <dl className="divide-y divide-(--line)/70 px-2 text-[13.5px]">
          <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
            <dt className="text-(--ink-faint)">File</dt>
            <dd className="max-w-[130px] truncate text-right text-(--ink)">{material.source.fileName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-(--ink-faint)">Size</dt>
            <dd className="text-(--ink)">{formatBytes(material.source.sizeBytes)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
            <dt className="text-(--ink-faint)">Added</dt>
            <dd className="text-(--ink)">{new Date(material.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="mono-label mb-3 px-2 text-[11px] tracking-[0.08em] text-(--ink-faint)">Contents</p>
        {hasContents ? (
          <nav aria-label="Material contents" className="space-y-1">
            {headings.map((heading, index) => {
              const isCurrent = index === 0
              return (
                <div
                  key={heading.id}
                  className={
                    isCurrent
                      ? 'relative rounded-[7px] bg-(--blue)/10 px-2 py-[7px] text-[13px] font-medium text-(--ink)'
                      : 'rounded-[7px] px-2 py-[7px] text-[13px] text-(--ink-soft)'
                  }
                >
                  {isCurrent && (
                    <span
                      className="absolute top-[6px] bottom-[6px] left-[-14px] w-0.5 rounded-full bg-(--blue)"
                      aria-hidden="true"
                    />
                  )}
                  <span className="line-clamp-2 leading-snug">{heading.text}</span>
                </div>
              )
            })}
          </nav>
        ) : (
          <p className="px-2 text-[13px] leading-relaxed text-(--ink-faint)">
            Sections appear here when headings are present. Add content with lines starting in
            &ldquo;# &rdquo; to build an outline.
          </p>
        )}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Shared collapse affordances for the side panels
// ---------------------------------------------------------------------------

/**
 * A narrow strip shown in place of a collapsed side panel. Lays out
 * vertically at desktop widths (a slim column) and horizontally on mobile
 * (a slim row), since the same collapsed state applies whether the panel
 * would otherwise take up width or stack in the flow.
 */
function CollapsedEdge({
  label,
  icon: Icon,
  onExpand,
}: {
  label: string
  icon: LucideIcon
  onExpand: () => void
}) {
  return (
    <div className="flex h-12 w-full shrink-0 items-center justify-center border-t border-(--line)/70 bg-(--surface)/40 lg:h-full lg:w-full lg:flex-col lg:justify-start lg:border-t-0 lg:py-3">
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Show ${label}`}
        title={`Show ${label}`}
        className="grid h-9 w-9 place-items-center rounded-xl text-(--ink-faint) transition hover:bg-(--surface-muted)/70 hover:text-(--ink)"
      >
        <Icon size={17} aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Concepts panel — persistent sidebar counterpart to the tutor
// Mirrors mockup's clarity dots + state + Review action for weak spots.
// Mastery is derived from live ReviewEvents via useConceptsMastery.
// ---------------------------------------------------------------------------

function ConceptsPanel({
  concepts,
  masteryById,
}: {
  concepts: Concept[]
  masteryById: Map<string, import('../hooks/useConceptsMastery').ConceptMastery>
}) {
  return (
    <div className="flex h-full flex-col bg-(--surface)/40">
      <div className="shrink-0 px-[18px] pt-4 pb-3">
        <p className="mono-label text-[11px] tracking-[0.06em] text-(--ink-faint)">Concepts</p>
      </div>

      {concepts.length === 0 ? (
        <p className="px-[18px] pb-5 text-[13.5px] leading-relaxed text-(--ink-faint)">
          No concepts linked yet. Select text and choose &ldquo;Concept&rdquo; to start one.
        </p>
      ) : (
        <ul className="space-y-0 overflow-y-auto px-1 pb-4">
          {concepts.map((concept) => {
            const state = masteryById.get(concept.id) ?? {
              label: 'Concept forming' as const,
              dotClass: 'bg-[#8891A8] shadow-[0_0_0_3px_rgba(137,145,168,0.14)]',
              showReview: false,
            }
            return (
              <li key={concept.id} className="flex items-center gap-2.5 px-[18px] py-[9px]">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${state.dotClass}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <Link
                    to="/concepts/$conceptId"
                    params={{ conceptId: concept.id }}
                    className="block truncate text-[13.5px] font-medium text-(--ink) hover:text-(--blue)"
                  >
                    {concept.name}
                  </Link>
                  <span className="font-mono text-[10.5px] tracking-[0.03em] text-(--ink-faint) uppercase">
                    {state.label}
                  </span>
                </span>
                {state.showReview && (
                  <span className="shrink-0 rounded-[7px] border border-[rgba(225,99,107,0.2)] bg-[rgba(225,99,107,0.13)] px-[9px] py-1 text-[11.5px] font-medium text-[#E1636B]">
                    Review
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Read pane
// ---------------------------------------------------------------------------

type ReadPaneProps = {
  readerRef: React.RefObject<HTMLElement | null>
  content: MaterialContent | undefined
  hasContent: boolean
  editing: boolean
  draft: string
  saving: boolean
  onDraftChange: (value: string) => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onSave: () => void
}

function ReadPane({
  readerRef,
  content,
  hasContent,
  editing,
  draft,
  saving,
  onDraftChange,
  onStartEditing,
  onCancelEditing,
  onSave,
}: ReadPaneProps) {
  const firstHeading = content?.blocks.find((block) => block.type === 'heading')?.text
  const eyebrow = firstHeading ? firstHeading : hasContent ? 'Reading' : 'Full text'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-(--line) pb-3">
        <p className="font-mono text-[11.5px] tracking-[0.06em] text-(--ink-faint) uppercase">{eyebrow}</p>

        {!editing && (
          <button type="button" onClick={onStartEditing} className="btn-ghost shrink-0 text-[13px]">
            {hasContent ? 'Edit content' : 'Add content'}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={16}
            placeholder="Paste or write the material's readable text here. Lines starting with '# ' become headings."
            className="min-h-88 w-full resize-y rounded-xl border border-(--line) bg-(--surface) p-4 text-[15px] leading-relaxed text-(--ink) outline-none transition focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/15"
          />

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancelEditing}
              disabled={saving}
              className="btn-ghost disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || draft.trim().length === 0}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save content'}
            </button>
          </div>
        </div>
      ) : content && content.blocks.length > 0 ? (
        <article id="reader-content" ref={readerRef} className="space-y-5">
          {content.blocks.map((block) =>
            block.type === 'heading' ? (
              <h1
                key={block.id}
                className="display pt-2 text-[29px] leading-[1.25] font-semibold tracking-[-0.01em] text-(--ink) first:pt-0"
              >
                {block.text}
              </h1>
            ) : (
              <p
                key={block.id}
                className="font-display text-[17px] leading-[1.75] font-normal text-[#3A423E] dark:text-(--ink-soft)"
              >
                {block.text}
              </p>
            ),
          )}
        </article>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-(--line-strong) bg-(--surface-muted) px-8 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-(--surface) text-(--ink-faint)">
            <FileText size={24} aria-hidden="true" />
          </span>

          <div className="max-w-sm">
            <p className="text-sm font-medium text-(--ink)">No readable content yet</p>
            <p className="mt-1.5 text-sm leading-relaxed text-(--ink-soft)">
              Add the material&apos;s text here, or it will be filled automatically when
              extraction is available.
            </p>
          </div>

          <button type="button" onClick={onStartEditing} className="btn-primary mt-1">
            Add content
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Explore pane
// ---------------------------------------------------------------------------

function ExplorePane({ concepts }: { concepts: Concept[] }) {
  return (
    <div>
      <p className="mono-label mb-6 border-b border-(--line) pb-5 text-(--ink-faint)">
        Concepts from this material
      </p>

      {concepts.length === 0 ? (
        <p className="text-sm leading-relaxed text-(--ink-faint)">
          No concepts are linked to this material yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {concepts.map((concept) => (
            <li
              key={concept.id}
              className="feed-row rounded-2xl border border-(--line) bg-(--surface) p-5"
            >
              <p className="font-medium text-(--ink)">
                <Link
                  to="/concepts/$conceptId"
                  params={{ conceptId: concept.id }}
                  className="hover:text-(--blue)"
                >
                  {concept.name}
                </Link>
              </p>

              {concept.description && (
                <p className="mt-2 text-sm leading-relaxed text-(--ink-soft)">
                  {concept.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Review pane
// ---------------------------------------------------------------------------

const REVIEW_LINKS = [
  { to: '/review', label: 'Start review', icon: ClipboardCheck },
  { to: '/flashcards', label: 'Flashcards', icon: NotebookPen },
] as const

function ReviewPane({ learningSpaceId }: { learningSpaceId: string }) {
  return (
    <div>
      <p className="mono-label mb-3 border-b border-(--line) pb-5 text-(--ink-faint)">
        Review &amp; practice
      </p>
      <p className="mt-4 text-sm leading-relaxed text-(--ink-soft)">
        Tie review to this material's concepts.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {REVIEW_LINKS.map(({ to, label, icon: LinkIcon }) => (
          <Link
            key={to}
            to={to}
            className="card-flat flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:border-(--blue) hover:shadow-md"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-(--surface-muted) text-(--blue)">
              <LinkIcon size={19} aria-hidden="true" />
            </span>
            <span className="font-medium text-(--ink)">{label}</span>
          </Link>
        ))}

        <Link
          to="/learning-spaces/$learningSpaceId"
          params={{ learningSpaceId }}
          className="card-flat flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:border-(--blue) hover:shadow-md"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-(--surface-muted) text-(--blue)">
            <Layers size={19} aria-hidden="true" />
          </span>
          <span className="font-medium text-(--ink)">Quiz</span>
        </Link>
      </div>
    </div>
  )
}