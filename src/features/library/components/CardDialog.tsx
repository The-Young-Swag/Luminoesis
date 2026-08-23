import { useEffect, useState, useTransition } from 'react'

import type { Card } from '#/shared/types/domain'

import { createCard } from '../application/createCard'
import { updateCard } from '../application/updateCard'

type CardDialogProps = {
  card?: Card
  onClose: () => void
  onSaved: () => void
}

export function CardDialog({
  card,
  onClose,
  onSaved,
}: CardDialogProps) {
  const [front, setFront] = useState(card?.front ?? '')
  const [back, setBack] = useState(card?.back ?? '')
  const [topic, setTopic] = useState(card?.topic ?? 'General')
  const [targetDate, setTargetDate] = useState(card?.targetDate ?? '')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setFront(card?.front ?? '')
    setBack(card?.back ?? '')
    setTopic(card?.topic ?? 'General')
    setTargetDate(card?.targetDate ?? '')
  }, [card?.id, card?.front, card?.back, card?.topic, card?.targetDate])

  const save = () => {
    if (!front.trim() || !back.trim()) {
      return
    }

    startTransition(async () => {
      if (card) {
        await updateCard(card.id, {
          front,
          back,
          topic,
          targetDate,
        })
      } else {
        await createCard({
          front,
          back,
          topic,
          targetDate,
        })
      }

      onSaved()
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={card ? 'Edit card' : 'New card'}
      onClick={onClose}
    >
      <div
        className="card-flat max-h-[90vh] w-full max-w-140 overflow-auto p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-[17px] font-semibold">
          {card ? 'Edit card' : 'Create a new card'}
        </h3>

        <p className="mt-1 text-sm text-(--ink-soft)">
          {card
            ? 'Make changes and save. It will update right away.'
            : 'One idea per card works best. You can add many more after.'}
        </p>

        <div className="mt-5 grid gap-4">
          <label className="text-sm">
            <span className="font-medium">
              Front — what you’ll see first
            </span>
            <span className="font-normal text-(--ink-faint)">
              {' '}
              (question, prompt, word)
            </span>

            <textarea
              value={front}
              onChange={(event) => setFront(event.target.value)}
              rows={3}
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) p-3 text-[15px] outline-none focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/20"
              placeholder="e.g. What is the primary neurotransmitter at the neuromuscular junction?"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">Back — the answer</span>
            <span className="font-normal text-(--ink-faint)">
              {' '}
              (keep it concise)
            </span>

            <textarea
              value={back}
              onChange={(event) => setBack(event.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-(--line) bg-(--surface) p-3 text-[15px] outline-none focus:border-(--blue) focus:ring-2 focus:ring-(--blue)/20"
              placeholder="e.g. Acetylcholine — released at the neuromuscular junction"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium">Topic</span>
              <span className="font-normal text-(--ink-faint)">
                {' '}
                (groups your cards)
              </span>

              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                list="topic-suggestions"
                className="mt-1.5 w-full rounded-full border border-(--line) bg-(--surface) px-3.5 py-2.5 text-sm outline-none focus:border-(--blue)"
                placeholder="General"
              />

              <datalist id="topic-suggestions">
                <option value="General" />
                <option value="Anatomy" />
                <option value="Physiology" />
                <option value="Pharmacology" />
              </datalist>
            </label>

            <label className="text-sm">
              <span className="font-medium">Target date</span>
              <span className="font-normal text-(--ink-faint)">
                {' '}
                (optional)
              </span>

              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="mt-1.5 w-full rounded-full border border-(--line) bg-(--surface) px-3.5 py-2.5 text-sm outline-none"
              />
            </label>
          </div>

          <p className="text-xs text-(--ink-faint)">
            Tip: Good cards are short and test one idea. You can always edit
            later.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="btn-ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>

          <button
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            onClick={save}
            disabled={!front.trim() || !back.trim() || isPending}
          >
            {isPending ? 'Saving…' : card ? 'Save changes' : 'Add card'}
          </button>
        </div>
      </div>
    </div>
  )
}