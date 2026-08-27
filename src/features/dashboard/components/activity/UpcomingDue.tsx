import { Link } from '@tanstack/react-router'
import {
  CalendarClock,
  GraduationCap,
  Sparkles,
} from 'lucide-react'

import { PanelHeader } from '#/features/dashboard/components/layout/PanelHeader'

import type { Card } from '#/features/library/domain/card'

const MAX_VISIBLE_CARDS = 5

type UpcomingDueProps = {
  dueToday: Card[]
  newCount: number
}

export function UpcomingDue({
  dueToday,
  newCount,
}: UpcomingDueProps) {
  const visibleCards =
    dueToday.slice(0, MAX_VISIBLE_CARDS)

  return (
    <div className="card-flat flex flex-col p-4 sm:p-5">
      <PanelHeader
        icon={<CalendarClock size={14} />}
        title="Upcoming & overdue"
        description="Cards waiting for a review, soonest due first"
        action={<span className="chip w-fit">Queue</span>}
      />

      <div className="space-y-1">
        {visibleCards.map((card) => (
          <QueueRow
            key={card.id}
            card={card}
          />
        ))}

        {dueToday.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-(--veridian-muted) px-3 py-2.5 text-sm leading-5 text-(--ink-soft)">
            <Sparkles
              size={14}
              className="mt-0.5 shrink-0 text-(--veridian)"
            />

            <span>
              All caught up. New cards ready:{' '}
              {newCount}
            </span>
          </div>
        )}
      </div>

      <Link
        to="/review"
        className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 no-underline"
      >
        <GraduationCap size={16} />
        Start review
      </Link>
    </div>
  )
}

function QueueRow({
  card,
}: {
  card: Card
}) {
  return (
    <div className="feed-row group flex min-w-0 flex-col gap-2 rounded-xl border border-transparent px-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2 hover:border-(--line)">
      <div className="min-w-0">
        <div className="wrap-break-word text-sm leading-5">
          {card.front}
        </div>

        <div className="mt-0.5 wrap-break-word text-xs leading-5 text-(--ink-faint)">
          {card.topic} · due {card.dueDate}
        </div>
      </div>

      <Link
        to="/review"
        className="shrink-0 self-start text-xs font-medium text-(--blue) no-underline opacity-70 transition-opacity group-hover:opacity-100 sm:self-auto"
      >
        Review
      </Link>
    </div>
  )
}