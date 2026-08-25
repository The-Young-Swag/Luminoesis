import { Link } from '@tanstack/react-router'
import { GraduationCap, Sparkles } from 'lucide-react'
import type { Card } from '#/features/library/domain/card'

const MAX_VISIBLE_CARDS = 5

type UpcomingDueProps = {
  dueToday: Card[]
  newCount: number
}

export function UpcomingDue({ dueToday, newCount }: UpcomingDueProps) {
  const visibleCards = dueToday.slice(0, MAX_VISIBLE_CARDS)

  return (
    <div className="card-flat flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Upcoming & overdue</h3>
        <span className="chip">Queue</span>
      </div>

      <div className="space-y-1">
        {visibleCards.map((card) => (
          <QueueRow key={card.id} card={card} />
        ))}

        {dueToday.length === 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-(--veridian-muted) px-3 py-2.5 text-sm text-(--ink-soft)">
            <Sparkles size={14} className="shrink-0 text-(--veridian)" />
            All caught up. New cards ready: {newCount}
          </div>
        )}
      </div>

      <Link to="/review" className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 no-underline">
        <GraduationCap size={16} />
        Start review
      </Link>
    </div>
  )
}

function QueueRow({ card }: { card: Card }) {
  return (
    <div className="feed-row group flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-2 hover:border-(--line)">
      <div className="min-w-0">
        <div className="truncate text-sm">{card.front}</div>
        <div className="text-xs text-(--ink-faint)">
          {card.topic} · due {card.dueDate}
        </div>
      </div>

      <Link
        to="/review"
        className="shrink-0 text-xs font-medium text-(--blue) no-underline opacity-70 transition-opacity group-hover:opacity-100"
      >
        Review
      </Link>
    </div>
  )
}