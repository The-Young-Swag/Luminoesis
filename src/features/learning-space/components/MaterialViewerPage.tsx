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
  Settings,
  UserCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
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

  const leftWidth = leftCollapsed ? 60 : 266
  const rightWidth = rightCollapsed ? 60 : 360
  const readerMax = leftCollapsed && rightCollapsed ? 860 : leftCollapsed ? 790 : rightCollapsed ? 830 : 680

  const { masteryById } = useConceptsMastery(associatedConcepts)

  return (
    <div className="page-wrap--wide flex flex-col h-screen overflow-hidden">
      {/* ================= Top bar ================= */}
      <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-(--line)/60 bg-(--surface)/90 bg-white/[0.015] backdrop-blur-md">
        <div className="flex items-center gap-2 text-[13.5px] text-(--ink-faint)">
          <Link
            to="/learning-spaces/$learningSpaceId"
            params={{ learningSpaceId: material.learningSpaceId }}
            className="hidden items-center gap-2 text-(--ink-faint) hover:text-(--ink) lg:flex"
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

        <div className="flex items-center gap-2">
          <span className="chip hidden lg:inline-flex">{material.type.toUpperCase()}</span>
          <span className="chip chip-live hidden lg:inline-flex">{STATUS_LABELS[material.extractionStatus] ?? material.extractionStatus}</span>
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
          <span className="hidden h-6 w-px bg-(--line) lg:block" aria-hidden="true" />
          <span className="grid h-7 w-7 place-items-center rounded-full bg-(--racing) text-white shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-(--emerald)" aria-hidden="true" />
          </span>
        </div>
      </header>

      {/* Mobile modes */}
      <div className="flex justify-center lg:hidden">
        <ModeTabs mode={mode} onChange={handleModeChange} />
      </div>

      {/* ================= Workspace ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex min-h-0 overflow-hidden rounded-2xl border border-(--line)/60 bg-(--surface)/80 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:h-[calc(100vh-9rem)] lg:min-h-[640px]">
          {/* Left: Study guide */}
          <div
            id="leftPanel"
            style={{ width: leftCollapsed ? 60 : 266 }}
            className="hidden shrink-0 flex-col overflow-hidden border-r border-(--line)/60 bg-(--surface)/40 backdrop-blur-sm transition-[width] duration-300 ease-out lg:flex"
          >
            {leftCollapsed ? (
              <div className="flex h-full w-[60px] flex-col items-center gap-1 pt-3">
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
                  title="Contents"
                  aria-label="Show contents"
                  className="grid h-8 w-8 place-items-center rounded-md text-(--ink-soft) hover:bg-(--surface-muted) hover:text-(--ink)"
                >
                  <List size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(false)}
                  title="Concepts"
                  aria-label="Show concepts"
                  className="grid h-8 w-8 place-items-center rounded-md text-(--ink-soft) hover:bg-(--surface-muted) hover:text-(--ink)"
                >
                  <Lightbulb size={18} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-(--line)/60 px-4">
                  <span className="text-[13px] font-semibold text-(--ink)">Study guide</span>
                  <button
                    type="button"
                    onClick={() => setLeftCollapsed(true)}
                    aria-label="Collapse study guide"
                    className="grid h-6 w-6 place-items-center rounded-md text-(--ink-faint) hover:bg-(--surface-muted) hover:text-(--ink)"
                  >
                    <PanelLeftClose size={14} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <details className="group border-b border-(--line)/60" open>
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 select-none [&::-webkit-details-marker]:hidden">
                      <span className="text-[13px] font-semibold text-(--ink)">Contents</span>
                      <ChevronRight size={12} className="text-(--ink-faint) transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
                    </summary>
                    <div className="px-3.5 pb-3">
                      <ContentsList content={content} />
                    </div>
                  </details>
                  <details className="group" open>
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 select-none [&::-webkit-details-marker]:hidden">
                      <span className="text-[13px] font-semibold text-(--ink)">Concepts</span>
                      <ChevronRight size={12} className="text-(--ink-faint) transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
                    </summary>
                    <div className="pb-2">
                      <LeftConceptsList concepts={associatedConcepts} masteryById={masteryById} />
                    </div>
                  </details>
                  <div className="px-4 py-3">
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-(--ink-faint)">File</dt>
                        <dd className="max-w-[140px] truncate text-right text-(--ink)">{material.source.fileName}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-(--ink-faint)">Size</dt>
                        <dd className="text-(--ink)">{formatBytes(material.source.sizeBytes)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-(--ink-faint)">Added</dt>
                        <dd className="text-(--ink)">{new Date(material.createdAt).toLocaleDateString()}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center: Reader */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-(--surface)">
            {/* Mobile left/right toggles when collapsed */}
            <div className="flex items-center justify-between border-b border-(--line)/60 bg-(--surface)/50 px-3 py-2 lg:hidden">
              <button
                type="button"
                onClick={() => setLeftCollapsed(!leftCollapsed)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-(--ink-soft) hover:bg-(--surface-muted) hover:text-(--ink)"
              >
                {leftCollapsed ? 'Show guide' : 'Hide guide'}
              </button>
              <button
                type="button"
                onClick={() => setRightCollapsed(!rightCollapsed)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-(--ink-soft) hover:bg-(--surface-muted) hover:text-(--ink)"
              >
                {rightCollapsed ? 'Show tutor' : 'Hide tutor'}
              </button>
            </div>
            <div className="relative min-h-0 flex-1 overflow-y-auto">
              <div
                id="readerContent"
                style={{ maxWidth: readerMax }}
                className="mx-auto px-6 py-8 transition-[max-width] duration-300 ease-out lg:px-16 lg:pt-14 lg:pb-24"
              >
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
            </div>
          </div>

          {/* Right: Ask Tutor */}
          <div
            id="rightPanel"
            style={{ width: rightWidth }}
            className="hidden shrink-0 flex-col overflow-hidden border-l border-(--line)/60 bg-(--surface)/40 backdrop-blur-sm transition-[width] duration-300 ease-out lg:flex"
          >
            {rightCollapsed ? (
              <div className="flex h-full w-[60px] flex-col items-center gap-1 pt-3">
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
                  onClick={() => setRightCollapsed(false)}
                  title="Ask tutor"
                  aria-label="Show tutor"
                  className="grid h-8 w-8 place-items-center rounded-md bg-(--blue)/10 text-(--blue) hover:bg-(--blue)/15"
                >
                  <MessageCircle size={18} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-(--line)/60 px-4">
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
                    hideHeader
                  />
                </div>
              </div>
            )}
          </div>
        </div>
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