import { Link } from '@tanstack/react-router'

import { Badge } from '#/shared/components/ui/Badge'
import { formatRelativeDue } from '#/shared/lib/dates'

import type { Card } from '#/features/library/domain/card'

type QueueGroups = {
  overdue: Card[]
  today: Card[]
  upcoming: Card[]
  dueCount: number
}

function monogram(topic: string): string {
  const initials = topic
    .split(/\s+/)
    .map((word) => word[0])
    .filter((letter): letter is string => letter !== undefined)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return initials || '••'
}

export function UpcomingDue({ groups, reviewedThisWeek }: { groups: QueueGroups; reviewedThisWeek: number }) {
  const { overdue, today, upcoming, dueCount } = groups

  return (
    <section
      aria-labelledby="queue-heading"
      className="card-flat flex h-full flex-col p-5 md:p-6"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 id="queue-heading" className="text-[15px] font-semibold">
            Up next
          </h2>
          <p className="mt-0.5 text-[13px] text-(--ink-soft)">
            Oldest first · {reviewedThisWeek} reviewed in the last 7 days
          </p>
        </div>

        {dueCount > 0 && (
          <Link
            to="/review"
            className="shrink-0 px-1 py-1.5 text-[13px] font-semibold text-(--accent) no-underline hover:underline"
          >
            See all {dueCount}
          </Link>
        )}
      </div>

      {dueCount === 0 ? (
        <p className="rounded-2xl bg-(--surface-muted) px-4 py-3.5 text-sm leading-6 text-(--ink-soft)">
          All caught up. New cards will appear here as soon as they are due.
        </p>
      ) : (
        <div className="min-w-0">
          <QueueGroup label="Overdue" cards={overdue} />
          <QueueGroup label="Today" cards={today} />
          <QueueGroup label="Upcoming" cards={upcoming} />
        </div>
      )}
    </section>
  )
}

function QueueGroup({ label, cards }: { label: string; cards: Card[] }) {
  if (cards.length === 0) return null

  return (
    <div>
      <p className="mb-1 mt-3.5 text-xs font-semibold text-(--ink-soft)">
        {label}
      </p>

      <ul>
        {cards.map((card) => (
          <li key={card.id}>
            <Link
              to="/review"
              className="group flex min-h-15 items-center gap-3.5 rounded-2xl px-2.5 py-2 transition-colors hover:bg-(--surface-muted) no-underline"
            >
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-(--surface-muted) text-[13px] font-bold text-(--ink-soft)"
              >
                {monogram(card.topic)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-(--ink)">
                  {card.front}
                </span>
                <span className="mt-0.5 block truncate text-xs text-(--ink-soft)">
                  {card.topic}
                </span>
              </span>

              <QueueChip dueDate={card.dueDate} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QueueChip({ dueDate }: { dueDate: string }) {
  const relative = formatRelativeDue(dueDate)

  return (
    <span className="shrink-0">
      <Badge tone={relative.tone === 'warn' ? 'warn' : 'neutral'}>
        {relative.label}
      </Badge>
    </span>
  )
}
