import type { RawCard } from '#/features/library/domain/import'
import { Inbox, Trash2 } from 'lucide-react'

type ImportPreviewProps = {
    cards: RawCard[]
    onUpdate: (index: number, patch: Partial<RawCard>) => void
    onRemove: (index: number) => void
    }

    export function ImportPreview({
    cards,
    onUpdate,
    onRemove,
    }: ImportPreviewProps) {
    if (cards.length === 0) {
        return (
        <div className="mt-4 rounded-xl border border-dashed border-(--line) bg-(--surface-muted) px-6 py-10 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-(--line) bg-(--surface) text-(--ink-faint)">
              <Inbox size={18} aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-medium text-(--ink)">No cards yet</p>
            <p className="mx-auto mt-1.5 max-w-[42ch] text-sm leading-6 text-(--ink-soft)">
            Paste some notes above or try an example. Your cards will appear here
            for review before they are added.
            </p>
        </div>
        )
    }

    return (
        <div className="mt-4 grid max-h-128 gap-3 overflow-y-auto pr-1">
        {cards.map((card, index) => (
            <article
            key={index}
            className="rounded-xl border border-(--line) bg-(--surface) p-4 transition-colors hover:border-(--line-strong)"
            >
            <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-(--surface-muted) px-1.5 text-xs font-semibold tabular-nums text-(--ink-soft)">
                    {index + 1}
                </span>

                <span className="text-xs font-semibold uppercase tracking-wide text-(--ink-faint)">
                    Card
                </span>
                </div>

                <button
                type="button"
                aria-label={`Remove card ${index + 1}`}
                onClick={() => onRemove(index)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--ink-faint) transition-colors hover:bg-(--destructive)/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-(--destructive)/20"
                >
                <Trash2 size={14} aria-hidden="true" />
                </button>
            </header>

            <div className="mt-3 grid gap-3">
                <label className="block">
                <span className="text-xs font-medium text-(--ink-soft)">
                    Question
                </span>

                <textarea
                    value={card.front}
                    onChange={(event) =>
                    onUpdate(index, { front: event.target.value })
                    }
                    rows={2}
                    placeholder="What should you remember?"
                    className="mt-1.5 w-full resize-y rounded-lg border border-(--line) bg-(--surface-muted) px-3 py-2.5 text-sm leading-6 text-(--ink) outline-none transition-colors placeholder:text-(--ink-faint) focus:border-(--blue) focus:bg-(--surface) focus:ring-2 focus:ring-(--blue)/10"
                />
                </label>

                <label className="block">
                <span className="text-xs font-medium text-(--ink-soft)">
                    Answer
                </span>

                <textarea
                    value={card.back}
                    onChange={(event) =>
                    onUpdate(index, { back: event.target.value })
                    }
                    rows={2}
                    placeholder="What is the answer?"
                    className="mt-1.5 w-full resize-y rounded-lg border border-(--line) bg-(--surface-muted) px-3 py-2.5 text-sm leading-6 text-(--ink) outline-none transition-colors placeholder:text-(--ink-faint) focus:border-(--blue) focus:bg-(--surface) focus:ring-2 focus:ring-(--blue)/10"
                />
                </label>

                <label className="block max-w-xs">
                <span className="text-xs font-medium text-(--ink-soft)">
                    Topic
                </span>

                <input
                    value={card.topic}
                    onChange={(event) =>
                    onUpdate(index, { topic: event.target.value })
                    }
                    placeholder="General"
                    className="mt-1.5 w-full rounded-lg border border-(--line) bg-(--surface-muted) px-3 py-2 text-sm text-(--ink) outline-none transition-colors placeholder:text-(--ink-faint) focus:border-(--blue) focus:bg-(--surface) focus:ring-2 focus:ring-(--blue)/10"
                />
                </label>
            </div>
            </article>
        ))}
        </div>
    )
}