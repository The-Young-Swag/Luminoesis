import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  FileText,
  Info,
  Plus,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

import type { RawCard } from '#/features/library/domain/import'
import { parseAny } from '#/features/library/domain/import'

import { importCards } from '../application/importCards'
import { ImportPreview } from './ImportPreview'

const TEMPLATES: Record<
  string,
  { label: string; hint: string; content: string }
> = {
  notes: {
    label: 'Class notes',
    hint: 'Bullets or headings — simplest',
    content: `My Biology Notes

Photosynthesis :: How plants make food from sunlight and CO2
Mitosis :: Cell division that makes two identical cells
DNA :: Carries genetic information in every cell

Study tips
- Review a little each day
- Test yourself without looking`,
  },

  vocab: {
    label: 'Vocab Q&A',
    hint: 'Questions and answers',
    content: `Q: What does "photosynthesis" mean?
A: How plants use sunlight to make food

Q: What is mitosis?
A: When one cell splits into two identical cells

Q: Where is DNA found?
A: In the nucleus of every cell`,
  },

  list: {
    label: 'Simple list',
    hint: 'One idea per line',
    content: `Capital of France :: Paris
Largest planet :: Jupiter
Water formula :: H2O
Speed of light :: 299,792 km per second`,
  },

  sample: {
    label: 'Try a sample',
    hint: 'Medical review — full example',
    content: `## Anatomy
What is the primary neurotransmitter at the neuromuscular junction? :: Acetylcholine
Which nerve innervates the thenar eminence? :: Median nerve

## Pharmacology
ACE inhibitors — how do they work? :: Block angiotensin I → II
Warfarin antidote :: Vitamin K`,
  },
}

const SUPPORTED = '.txt, .md, .json, .csv'

function humanWarning(warning: string): string {
  if (warning.includes('No content')) {
    return 'Your paste area is empty — add some text or try a template above.'
  }

  if (warning.includes('No cards detected')) {
    return 'We couldn’t find cards yet. Try one idea per line, or use “Question :: Answer”.'
  }

  if (warning.includes('Duplicate skipped')) {
    return warning.replace('Duplicate skipped', 'Skipped duplicate')
  }

  if (warning.includes('Invalid JSON')) {
    return 'That JSON doesn’t look right — check it has front and back for each card.'
  }

  if (warning.includes('JSON parse')) {
    return 'We couldn’t read that JSON — it might be missing a bracket or quote.'
  }

  return warning
}

type ImportWizardProps = {
  onClose: () => void
  onImported: () => void
}

export function ImportWizard({
  onClose,
  onImported,
}: ImportWizardProps) {
  const [mode, setMode] = useState<'paste' | 'file'>('paste')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [debounced, setDebounced] = useState('')
  const [editable, setEditable] = useState<RawCard[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebounced(text)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [text])

  useEffect(() => {
    const result = parseAny(debounced)

    setEditable(result.cards)
    setWarnings(result.warnings.map(humanWarning))
  }, [debounced])

  const canImport =
    editable.length > 0 &&
    editable.every(
      (card) => card.front.trim() && card.back.trim(),
    )

  const loadFile = async (file: File) => {
    const content = await file.text()

    setFileName(file.name)
    setText(content)
    setMode('paste')
  }

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()
    setDragOver(false)

    const file = event.dataTransfer.files.item(0)

    if (file) {
      await loadFile(file)
    }
  }

  const handleFilePick = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.item(0) ?? null

    if (file) {
      await loadFile(file)
    }
  }

  const useTemplate = (key: string) => {
    setText(TEMPLATES[key].content)
  }

  const updateCard = (
    index: number,
    patch: Partial<RawCard>,
  ) => {
    setEditable((currentCards) =>
      currentCards.map((card, currentIndex) =>
        currentIndex === index
          ? { ...card, ...patch }
          : card,
      ),
    )
  }

  const removeCard = (index: number) => {
    setEditable((currentCards) =>
      currentCards.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  const addBlank = () => {
    setEditable((currentCards) => [
      ...currentCards,
      {
        front: '',
        back: '',
        topic: 'General',
      },
    ])
  }

  const handleImport = async () => {
    const cards = await importCards(editable)

    if (cards.length === 0) {
      return
    }

    onImported()
    onClose()
  }

  const clearAll = () => {
    setText('')
    setFileName(null)
    setEditable([])
    setWarnings([])
  }

  return (
    <div
      className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add cards to your library"
      onClick={onClose}
    >
      <div
        className="glass-surface glass-specular rise flex max-h-[92vh] w-full max-w-220 flex-col overflow-hidden rounded-[20px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-(--line) px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="display flex items-center gap-2 text-[22px] leading-tight">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-(--ink) text-white">
                  <Sparkles size={16} />
                </span>

                Add to your library
              </h2>

              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-(--ink-soft)">
                Paste whatever you have — notes, lists, questions — or upload
                a file. We’ll turn it into study cards you can tweak before
                saving. No special formatting needed.
              </p>
            </div>

            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-(--line) hover:bg-(--surface-muted)"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-5 inline-flex rounded-full border border-(--line) bg-(--surface-muted) p-1">
            <button
              type="button"
              onClick={() => setMode('paste')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === 'paste'
                  ? 'border border-(--line) bg-(--surface) text-(--ink) shadow-sm'
                  : 'text-(--ink-soft)'
              }`}
            >
              <FileText size={16} />
              Paste notes
            </button>

            <button
              type="button"
              onClick={() => setMode('file')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === 'file'
                  ? 'border border-(--line) bg-(--surface) text-(--ink) shadow-sm'
                  : 'text-(--ink-soft)'
              }`}
            >
              <Upload size={16} />
              Upload file
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-5 p-6">
            {mode === 'paste' ? (
              <>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-(--ink-faint)">
                    Start with an example — tap to try
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(TEMPLATES).map(([key, template]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => useTemplate(key)}
                        className="group rounded-xl border border-(--line) bg-(--surface) p-3 text-left transition hover:border-(--blue) hover:bg-(--blue)/8"
                      >
                        <div className="text-sm font-semibold group-hover:text-(--blue)">
                          {template.label}
                        </div>

                        <div className="mt-0.5 text-xs text-(--ink-faint)">
                          {template.hint}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">Your notes</span>

                  <span className="ml-2 text-xs text-(--ink-faint)">
                    Paste however they are — we’ll sort it
                  </span>

                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={9}
                    className="mt-2 w-full rounded-xl border border-(--line) bg-(--surface-muted) p-4 text-[15px] leading-relaxed outline-none placeholder:text-(--ink-faint) focus:border-(--blue) focus:bg-(--surface) focus:ring-2 focus:ring-(--blue)/10"
                    placeholder={`Try:

Photosynthesis :: How plants make food
Mitosis :: Cell division

Or:
Q: What is photosynthesis?
A: How plants use sunlight

Or just one fact per line — we’ll handle the rest.`}
                  />

                  <span className="mt-1.5 block text-xs text-(--ink-faint)">
                    Tip: One idea per line works great. You can also use
                    “Question :: Answer”.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowTips((visible) => !visible)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-(--ink-soft) hover:text-(--ink)"
                >
                  <Info size={14} />
                  How it works

                  <ChevronDown
                    size={12}
                    className={`transition ${
                      showTips ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showTips && (
                  <div className="rounded-xl border border-(--line) bg-(--surface-muted) p-4 text-sm leading-relaxed text-(--ink-soft)">
                    <ul className="list-disc space-y-1 pl-5">
                      <li>
                        <strong>Headings become topics</strong> — Start a line
                        with{' '}
                        <code className="rounded border border-(--line) bg-(--surface) px-1.5 py-0.5">
                          ## Biology
                        </code>{' '}
                        to group cards.
                      </li>

                      <li>
                        <strong>Bullets become cards</strong> — Each{' '}
                        <code className="rounded border border-(--line) bg-(--surface) px-1.5 py-0.5">
                          - Idea
                        </code>{' '}
                        is a card.
                      </li>

                      <li>
                        <strong>Separators split front/back</strong> —{' '}
                        <code className="rounded border border-(--line) bg-(--surface) px-1.5 py-0.5">
                          ::
                        </code>
                        ,{' '}
                        <code className="rounded border border-(--line) bg-(--surface) px-1.5 py-0.5">
                          -&gt;
                        </code>{' '}
                        or simply write a question.
                      </li>

                      <li>
                        CSV and JSON files work too — just upload and we’ll
                        read them.
                      </li>
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                    dragOver
                      ? 'border-(--blue) bg-(--blue)/8'
                      : 'border-(--line) bg-(--surface) hover:border-(--line-strong)'
                  }`}
                >
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-(--line) bg-(--surface)">
                    <Upload size={18} />
                  </div>

                  <div className="mt-3 font-medium">
                    Drop your file here or click to browse
                  </div>

                  <div className="mt-1 text-sm text-(--ink-faint)">
                    Supported: {SUPPORTED} · Your data stays on this device
                  </div>

                  {fileName && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--surface) px-3 py-1.5 text-sm">
                      <FileText size={14} />
                      {fileName}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.markdown,.json,.csv"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                </div>

                {text && (
                  <div className="rounded-xl border border-(--line) bg-(--surface) p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-(--ink-faint)">
                      File contents — you can still edit
                    </div>

                    <textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      rows={6}
                      className="mt-2 w-full rounded-xl border border-(--line) bg-(--surface-muted) p-3 font-mono text-sm outline-none"
                    />
                  </div>
                )}
              </>
            )}

            <div className="border-t border-(--line) pt-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  Preview

                  <span className="rounded-full border border-(--line) bg-(--surface-muted) px-2.5 py-0.5 text-xs font-medium">
                    {editable.length} card
                    {editable.length === 1 ? '' : 's'} found
                  </span>

                  {editable.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-(--emerald)/30 bg-(--emerald-muted) px-2 py-0.5 text-xs text-(--veridian-strong)">
                      <Check size={12} />
                      Ready to edit
                    </span>
                  )}
                </h3>

                {editable.length > 0 && (
                  <button
                    type="button"
                    onClick={addBlank}
                    className="inline-flex items-center gap-1.5 rounded-full border border-(--line) bg-(--surface) px-3 py-1.5 text-xs font-medium hover:bg-(--surface-muted)"
                  >
                    <Plus size={12} />
                    Add card
                  </button>
                )}
              </div>

              {warnings.length > 0 && (
                <div className="mt-3 rounded-xl border border-(--warning)/30 bg-(--warning-muted) p-3 text-sm text-(--warning-strong)">
                  {warnings.map((warning) => (
                    <div key={warning} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-(--warning)" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              <ImportPreview
                cards={editable}
                onUpdate={updateCard}
                onRemove={removeCard}
              />

              {editable.length > 20 && (
                <p className="mt-2 text-xs text-(--ink-faint)">
                  Showing all {editable.length} cards — they’ll all be added.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-(--line) bg-(--surface-muted) px-6 py-4">
          <button
            type="button"
            className="btn-ghost bg-(--surface)"
            onClick={onClose}
          >
            Cancel
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost bg-(--surface)"
              onClick={clearAll}
            >
              Clear all
            </button>

            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleImport}
              disabled={!canImport}
            >
              <Check size={16} />

              Add{' '}
              {editable.length
                ? `${editable.length} card${
                    editable.length === 1 ? '' : 's'
                  }`
                : 'cards'}{' '}
              to library
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}