import type { Card } from '#/shared/types/domain'
import { Pencil, SearchX, Trash2 } from 'lucide-react'

type LibraryTableProps = {
  cards: Card[]
  onEdit: (card: Card) => void
  onDelete: (id: string) => void
}

export function LibraryTable({
  cards,
  onEdit,
  onDelete,
}: LibraryTableProps) {
  if (cards.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-(--line) bg-(--surface-muted) text-(--ink-faint)">
          <SearchX size={18} aria-hidden="true" />
        </div>

        <p className="mt-4 text-sm font-medium text-(--ink)">
          No cards found
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-(--ink-soft)">
          Try a different search, or add a new card to grow your knowledge.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 text-sm">
        <caption className="sr-only">
          Your knowledge cards
        </caption>

        <thead className="border-b border-(--line) bg-(--surface-muted) text-xs uppercase tracking-wide text-(--ink-faint)">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left font-semibold sm:px-5"
            >
              Question
            </th>

            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-semibold sm:table-cell"
            >
              Answer
            </th>

            <th
              scope="col"
              className="px-4 py-3 text-left font-semibold"
            >
              Topic
            </th>

            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-semibold md:table-cell"
            >
              Next review
            </th>

            <th
              scope="col"
              className="w-24 px-4 py-3"
            >
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-(--line)">
          {cards.map((card) => (
            <tr
              key={card.id}
              className="group transition-colors duration-150 hover:bg-(--surface-muted)"
            >
              <td className="max-w-[320px] px-4 py-3.5 sm:px-5">
                <div
                  className="truncate font-medium text-(--ink)"
                  title={card.front}
                >
                  {card.front}
                </div>
              </td>

              <td className="hidden max-w-70 px-4 py-3.5 sm:table-cell">
                <div
                  className="truncate text-(--ink-soft)"
                  title={card.back}
                >
                  {card.back}
                </div>
              </td>

              <td className="px-4 py-3.5">
                <span className="inline-flex max-w-40 truncate rounded-full border border-(--line) bg-(--surface-muted) px-2.5 py-1 text-xs font-medium text-(--ink-soft)">
                  {card.topic}
                </span>
              </td>

              <td className="hidden px-4 py-3.5 text-(--ink-soft) md:table-cell">
                <span className="font-mono whitespace-nowrap text-xs tabular-nums">
                  {card.dueDate}
                </span>
              </td>

              <td className="px-4 py-3.5">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    aria-label={`Edit card: ${card.front}`}
                    title="Edit card"
                    onClick={() => onEdit(card)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-(--ink-faint) transition-colors duration-150 hover:border-(--line) hover:bg-(--surface) hover:text-(--ink) focus:outline-none focus:ring-2 focus:ring-(--blue)/20"
                  >
                    <Pencil
                      size={14}
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete card: ${card.front}`}
                    title="Delete card"
                    onClick={() => onDelete(card.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-(--ink-faint) transition-colors duration-150 hover:border-(--destructive)/25 hover:bg-(--destructive)/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-(--destructive)/20"
                  >
                    <Trash2
                      size={14}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}