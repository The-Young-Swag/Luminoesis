import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Layers,
  List,
  Lightbulb,
  Maximize2,
  MessageCircle,
  Minimize2,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ConceptMastery } from '../hooks/useConceptsMastery'
import type {
  Concept,
  Material,
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
import { TutorPanel } from '../../tutor/components/TutorPanel'
import type { TutorPanelHandle } from '../../tutor/components/TutorPanel'
import { SelectionBubble } from './SelectionBubble'
import type { ReaderSelection } from './SelectionBubble'
import { AddConceptDialog } from './AddConceptDialog'
import { AddFlashcardDialog } from '#/features/flashcard/components/AddFlashcardDialog'
import { AddQuestionDialog } from '#/features/quiz/components/AddQuestionDialog'
import { MaterialPreview } from './previews/MaterialPreview'

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ')
}


function renderContentBlocks(blocks: MaterialContentBlock[]) {
  return blocks.map((block) =>
    block.type === 'heading' ? (
      <h2
        key={block.id}
        id={`reader-${block.id}`}
        className="font-display scroll-mt-24 text-[34px] leading-[1.2] font-semibold tracking-tight text-(--ink)"
      >
        {block.text}
      </h2>
    ) : (
      <p
        key={block.id}
        className="font-display text-[18.5px] leading-[1.9] text-(--ink-soft)"
      >
        {block.text}
      </p>
    ),
  )
}
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
  // The Reader boundary: the Selection Bubble is only eligible to appear when
  // the browser selection lives inside this element. It's attached to the
  // <article> in ReadPane that renders actual material text — not to the
  // surrounding column, which also hosts Explore and Review content.
  const readerContentRef = useRef<HTMLDivElement>(null)
  const tutorRef = useRef<TutorPanelHandle>(null)

  const [mode, setMode] = useState<Mode>('read')
  const [paneMode, setPaneMode] = useState<PaneMode>('read')

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [leftCollapsed, setLeftCollapsed] = usePersistentBoolean(
    'material-viewer:left-collapsed',
    false,
  )
  const [rightCollapsed, setRightCollapsed] = usePersistentBoolean(
    'material-viewer:right-collapsed',
    false,
  )
  const focused = leftCollapsed && rightCollapsed

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = body.style.overflow
    root.setAttribute('data-hide-footer', '1')
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      root.removeAttribute('data-hide-footer')
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
    }
  }, [])

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
      if (!anchor || !readerContentRef.current?.contains(anchor)) {
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

  const handleTutorContextConsumed = useCallback(() => {
    setTutorContext(undefined)
  }, [])

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
    setSaveError(null)

    try {
      await saveMaterialContent({
        materialId: material.id,
        source: 'user',
        blocks: parseDraft(draft),
      })
      setEditing(false)
    } catch {
      setSaveError('Could not save — your edits are still here. Try again.')
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
      <div className="flex h-screen items-center justify-center">
        <p className="mono-label text-(--ink-faint)">Loading material…</p>
      </div>
    )
  }

  if (!material) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="mono-label text-destructive">Material not found</p>
        <Link to="/learning-spaces" className="btn-ghost">
          Back to Learning Spaces
        </Link>
      </div>
    )
  }

  const hasOriginalPreview = TYPES_WITH_ORIGINAL_FILE_PREVIEW.has(material.type)
  const readerWidthClass = hasOriginalPreview
    ? focused
      ? 'max-w-[1100px]'
      : 'max-w-[900px]'
    : focused
      ? 'max-w-[1080px]'
      : 'max-w-[900px]'

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ================= Top bar ================= */}
      <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-(--glass-border) bg-(--glass-bg-strong) backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[13.5px] text-(--ink-faint)">
          <Link
            to="/learning-spaces/$learningSpaceId"
            params={{ learningSpaceId: material.learningSpaceId }}
            className="hidden items-center gap-2 hover:text-(--ink) lg:flex"
            aria-label="Back to space"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          <span className="hidden h-4 w-px bg-(--line) lg:block" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-1.5">
            {learningSpace && (
              <>
                <span className="hidden truncate lg:block">{learningSpace.title}</span>
                <span className="hidden text-(--ink-faint) lg:block" aria-hidden="true">
                  ›
                </span>
              </>
            )}
            <b className="truncate font-medium text-(--ink)">{material.title}</b>
          </div>
        </div>

        <div className="hidden lg:flex">
          <ModeTabs mode={mode} onChange={handleModeChange} />
        </div>

        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={toggleFocusMode}
            aria-pressed={focused}
            title={focused ? 'Show panels' : 'Focus mode'}
            className={cx(
              'grid h-8 w-8 place-items-center rounded-lg border transition',
              focused
                ? 'border-(--blue)/30 bg-(--blue)/10 text-(--blue)'
                : 'border-transparent text-(--ink-faint) hover:bg-(--surface-muted) hover:text-(--ink)',
            )}
          >
            {focused ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
          </button>
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-(--racing) text-white shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-(--emerald)" aria-hidden="true" />
          </span>
        </div>
      </header>

      {/* Mobile modes */}
      <div className="flex h-12 shrink-0 items-center justify-center border-b border-(--glass-border) bg-(--glass-bg-strong)/70 px-3 backdrop-blur-xl lg:hidden">
        <ModeTabs mode={mode} onChange={handleModeChange} />
      </div>

      {/* ================= Workspace ================= */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Study Guide */}
        <div
          id="leftPanel"
          style={{ width: leftCollapsed ? 60 : 266 }}
          className="hidden min-w-0 shrink-0 overflow-hidden border-r border-(--glass-border) bg-[color-mix(in_oklab,var(--surface)_38%,transparent)] backdrop-blur-xl backdrop-saturate-150 dark:bg-[color-mix(in_oklab,var(--surface)_30%,transparent)] lg:flex transition-[width] duration-300 ease-out"
        >
          {leftCollapsed ? (
            <div className="flex h-full w-15 flex-col items-center gap-1 pt-3">
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                aria-label="Expand study guide"
                className="mb-2 grid h-8 w-8 place-items-center rounded-md text-(--ink-faint) hover:bg-(--surface-muted) hover:text-(--ink)"
              >
                <PanelLeftOpen size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                aria-label="Expand study guide contents"
                title="Contents"
                className="grid h-8 w-8 place-items-center rounded-md text-(--ink-soft) hover:bg-(--surface-muted) hover:text-(--ink)"
              >
                <List size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                aria-label="Expand study guide concepts"
                title="Concepts"
                className="grid h-8 w-8 place-items-center rounded-md text-(--ink-soft) hover:bg-(--surface-muted) hover:text-(--ink)"
              >
                <Lightbulb size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <StudyGuide
              content={content}
              material={material}
              concepts={associatedConcepts}
              masteryById={masteryById}
              onCollapse={() => setLeftCollapsed(true)}
            />
          )}
        </div>

        {/* Center: Reader */}
        <main className="sidebar-scroll min-w-0 flex-1 overflow-y-auto">
          <div
            className={cx(
              'relative mx-auto w-full',
              readerWidthClass,
              hasOriginalPreview
                ? 'px-3 py-5 sm:px-5 lg:px-8 lg:pb-24 lg:pt-8'
                : 'px-6 py-8 lg:px-16 lg:pb-24 lg:pt-14',
            )}
          >
          {paneMode === 'read' && (
            <ReadPane
              material={material}
              content={content}
              hasContent={hasContent}
              editing={editing}
              draft={draft}
              saving={saving}
              saveError={saveError}
              onDraftChange={setDraft}
              onStartEditing={startEditing}
              onCancelEditing={() => setEditing(false)}
              onSave={() => void saveContent()}
              contentRef={readerContentRef}
            />
          )}

            {paneMode === 'explore' && (
              <ExplorePane concepts={associatedConcepts} />
            )}

            {paneMode === 'review' && (
              <ReviewPane learningSpaceId={material.learningSpaceId} />
            )}

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
          </div>
        </main>

        {/* Right: Ask Tutor */}
        <div
          id="rightPanel"
          style={{ width: rightCollapsed ? 60 : 360 }}
          className="hidden shrink-0 overflow-hidden border-l border-(--glass-border) bg-[color-mix(in_oklab,var(--surface)_38%,transparent)] backdrop-blur-xl backdrop-saturate-150 dark:bg-[color-mix(in_oklab,var(--surface)_30%,transparent)] lg:flex lg:flex-col lg:min-h-0 transition-[width] duration-300 ease-out"
        >
          {rightCollapsed ? (
            <div className="flex h-full w-15 flex-col items-center gap-1 pt-3">
              <button
                type="button"
                onClick={() => setRightCollapsed(false)}
                aria-label="Expand tutor"
                className="mb-2 grid h-8 w-8 place-items-center rounded-md text-(--ink-faint) hover:bg-(--surface-muted) hover:text-(--ink)"
              >
                <PanelRightOpen size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRightCollapsed(false)
                  window.setTimeout(() => tutorRef.current?.focusInput(), 50)
                }}
                aria-label="Ask tutor"
                title="Ask tutor"
                className="grid h-8 w-8 place-items-center rounded-md bg-(--blue)/10 text-(--blue) hover:bg-(--blue)/15"
              >
                <MessageCircle size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-(--glass-border) px-4">
                <button
                  type="button"
                  onClick={() => setRightCollapsed(true)}
                  aria-label="Collapse tutor"
                  className="grid h-6 w-6 place-items-center rounded-md text-(--ink-faint) hover:bg-(--surface-muted) hover:text-(--ink)"
                >
                  <PanelRightClose size={14} aria-hidden="true" />
                </button>
                <span className="text-[13px] font-semibold text-(--ink)">Ask tutor</span>
                <span className="w-6" aria-hidden="true" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
              <TutorPanel
                ref={tutorRef}
                materialTitle={material.title}
                materialId={material.id}
                learningSpaceId={material.learningSpaceId}
                context={tutorContext}
                onContextConsumed={handleTutorContextConsumed}
                hideHeader
                active={!rightCollapsed}
              />
              </div>
            </div>
          )}
        </div>
      </div>

      <AddConceptDialog
        open={showConcept}
        learningSpaceId={material.learningSpaceId}
        materials={materials}
        initialName={pendingText?.slice(0, 80)}
        initialMaterialIds={[material.id]}
        onCreated={() => setShowConcept(false)}
        onClose={() => setShowConcept(false)}
      />

      <AddFlashcardDialog
        open={showFlashcard}
        concepts={concepts}
        materials={materials}
        initialFront={pendingText}
        initialMaterialId={material.id}
        onCreated={() => setShowFlashcard(false)}
        onClose={() => setShowFlashcard(false)}
      />

      <AddQuestionDialog
        open={showQuiz}
        concepts={concepts}
        initialPrompt={pendingText}
        initialMaterialId={material.id}
        onCreated={() => setShowQuiz(false)}
        onClose={() => setShowQuiz(false)}
      />
    </div>
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
      className="inline-flex items-center gap-1 rounded-xl border border-(--glass-border) bg-(--glass-bg) p-1 backdrop-blur-sm"
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
              'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
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
// Study Guide — Contents and Concepts (matches mockup)
// ---------------------------------------------------------------------------

function StudyGuide({
  content,
  material,
  concepts,
  masteryById,
  onCollapse,
}: {
  content: MaterialContent | undefined
  material: { source: { fileName: string; sizeBytes: number }; createdAt: number }
  concepts: Concept[]
  masteryById: Map<string, ConceptMastery>
  onCollapse: () => void
}) {
  const headings = content?.blocks.filter((block) => block.type === 'heading') ?? []

  const [contentsOpen, setContentsOpen] = useState(true)
  const [conceptsOpen, setConceptsOpen] = useState(true)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-(--glass-border) px-4">
        <span className="text-[13px] font-semibold text-(--ink)">
          Study guide
        </span>

        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse study guide"
          className="grid h-6 w-6 place-items-center rounded-md text-(--ink-faint) hover:bg-(--surface-muted) hover:text-(--ink)"
        >
          <PanelLeftClose size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Contents */}
        <section className="shrink-0 border-b border-(--glass-border)">
          <button
            type="button"
            onClick={() => setContentsOpen((open) => !open)}
            aria-expanded={contentsOpen}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left select-none"
          >
            <span className="text-[13px] font-medium text-(--ink)">
              Contents
            </span>

            <ChevronRight
              size={12}
              className={cx(
                'shrink-0 text-(--ink-faint) transition-transform duration-200',
                contentsOpen && 'rotate-90',
              )}
              aria-hidden="true"
            />
          </button>

          {contentsOpen && (
            <div className="min-w-0 px-3.5 pb-3">
              {headings.length > 0 ? (
                <div className="flex min-w-0 flex-col gap-0.5">
                  {headings.map((heading) => (
                    <button
                      key={heading.id}
                      type="button"
                      onClick={() => {
                        const reduced = window.matchMedia(
                          '(prefers-reduced-motion: reduce)',
                        ).matches
                        document
                          .getElementById(`reader-${heading.id}`)
                          ?.scrollIntoView({
                            behavior: reduced ? 'auto' : 'smooth',
                            block: 'start',
                          })
                      }}
                      className="ml-3.5 min-w-0 rounded-md px-2 py-1.5 text-left text-[13px] text-(--ink-soft) transition-colors hover:bg-(--surface-muted) hover:text-(--ink) focus-visible:outline-2"
                    >
                      <span className="block line-clamp-2 leading-snug">
                        {heading.text}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2 text-[13px] text-(--ink-faint)">
                  Sections appear here when headings are present.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Concepts */}
        <section className="shrink-0">
          <button
            type="button"
            onClick={() => setConceptsOpen((open) => !open)}
            aria-expanded={conceptsOpen}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left select-none"
          >
            <span className="text-[13px] font-medium text-(--ink)">
              Concepts
            </span>

            <ChevronRight
              size={12}
              className={cx(
                'shrink-0 text-(--ink-faint) transition-transform duration-200',
                conceptsOpen && 'rotate-90',
              )}
              aria-hidden="true"
            />
          </button>

          {conceptsOpen && (
            <div className="min-w-0 pb-2">
              {concepts.length === 0 ? (
                <p className="px-4 text-[13px] text-(--ink-faint)">
                  No concepts linked yet.
                </p>
              ) : (
                <div className="flex min-w-0 flex-col">
                  {concepts.map((concept) => {
                    const state = masteryById.get(concept.id) ?? {
                      label: 'Concept forming',
                      dotClass:
                        'bg-[#8891A8] shadow-[0_0_0_3px_rgba(137,145,168,0.14)]',
                      showReview: false,
                    }

                    return (
                      <div
                        key={concept.id}
                        className="flex min-w-0 items-center gap-2.5 px-4 py-2"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${state.dotClass}`}
                          aria-hidden="true"
                        />

                        <div className="min-w-0 flex-1">
                          <Link
                            to="/concepts/$conceptId"
                            params={{ conceptId: concept.id }}
                            className="block truncate text-[13.5px] font-medium text-(--ink) hover:text-(--blue)"
                          >
                            {concept.name}
                          </Link>

                          <span className="block truncate font-mono text-[10.5px] uppercase tracking-wide text-(--ink-faint)">
                            {state.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Source info */}
      <div className="shrink-0 border-t border-(--glass-border) px-4 py-3">
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-(--ink-faint)">File</dt>
            <dd className="max-w-35 truncate text-right text-(--ink)">
              {material.source.fileName}
            </dd>
          </div>

          <div className="flex justify-between gap-2">
            <dt className="text-(--ink-faint)">Size</dt>
            <dd className="text-(--ink)">
              {formatBytes(material.source.sizeBytes)}
            </dd>
          </div>

          <div className="flex justify-between gap-2">
            <dt className="text-(--ink-faint)">Added</dt>
            <dd className="text-(--ink)">
              {new Date(material.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Read pane
// ---------------------------------------------------------------------------

type ReadPaneProps = {
  material: Material
  content: MaterialContent | undefined
  hasContent: boolean
  editing: boolean
  draft: string
  saving: boolean
  saveError: string | null
  onDraftChange: (value: string) => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onSave: () => void
  // The Reader boundary is attached to the actual document content by each
  // preview renderer. Viewer controls intentionally remain outside it.
  contentRef: React.RefObject<HTMLDivElement | null>
}

const TYPES_WITH_ORIGINAL_FILE_PREVIEW = new Set<Material['type']>([
  'pdf',
  'docx',
  'pptx',
  'image',
])

function ReadPane({
  material,
  content,
  hasContent,
  editing,
  draft,
  saving,
  saveError,
  onDraftChange,
  onStartEditing,
  onCancelEditing,
  onSave,
  contentRef,
}: ReadPaneProps) {
  const firstHeading = content?.blocks.find((block) => block.type === 'heading')?.text
  const eyebrow = firstHeading ? firstHeading : hasContent ? 'Reading' : 'Full text'
  const showsOriginalDocumentPreview = TYPES_WITH_ORIGINAL_FILE_PREVIEW.has(material.type)

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

          {saveError ? (
            <p role="alert" className="mt-3 text-right text-sm font-medium text-(--destructive)">
              {saveError}
            </p>
          ) : null}
        </div>
      ) : showsOriginalDocumentPreview ? (
        <MaterialPreview
          material={material}
          contentRef={contentRef}
          fallback={
            content && content.blocks.length > 0 ? (
              <div className="space-y-5">{renderContentBlocks(content.blocks)}</div>
            ) : (
              <EmptyReaderState label="Preview unavailable">
                The original file wasn&apos;t saved for this material, so we can&apos;t show a
                document preview. Extracted text will appear here once available.
              </EmptyReaderState>
            )
          }
        />
      ) : content && content.blocks.length > 0 ? (
        <article id="reader-content" ref={contentRef} className="space-y-5">
          {renderContentBlocks(content.blocks)}
        </article>
      ) : (
        <EmptyReaderState label="No readable content yet" onStartEditing={onStartEditing}>
          Add the material&apos;s text here, or it will be filled automatically when extraction is
          available.
        </EmptyReaderState>
      )}
    </div>
  )
}

function EmptyReaderState({
  label,
  children,
  onStartEditing,
}: {
  label: string
  children: React.ReactNode
  onStartEditing?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-(--line-strong) bg-(--surface-muted) px-8 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-(--surface) text-(--ink-faint)">
        <FileText size={24} aria-hidden="true" />
      </span>

      <div className="max-w-sm">
        <p className="text-sm font-medium text-(--ink)">{label}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-(--ink-soft)">{children}</p>
      </div>

      {onStartEditing && (
        <button type="button" onClick={onStartEditing} className="btn-primary mt-1">
          Add content
        </button>
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
          No concepts linked yet. Select text in the reader to create one.
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