import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

type RetentionItem = { topic: string; rate: number }

type RetentionBarsProps = {
  data: RetentionItem[]
}

export function RetentionBars({ data }: RetentionBarsProps) {
  if (data.length === 0) {
    return <p className="text-sm text-(--ink-soft)">No reviews yet.</p>
  }

  return (
    <ol className="space-y-1">
      {data.map((topic, index) => (
        <RetentionRow key={topic.topic} rank={index + 1} topic={topic} />
      ))}
    </ol>
  )
}

function RetentionRow({ rank, topic }: { rank: number; topic: RetentionItem }) {
  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-(--surface-muted)">
      <span className={`rank-badge ${rank === 1 ? 'rank-badge-first' : ''}`}>{rank}</span>

      <span className="w-28 shrink-0 truncate text-xs font-medium">{topic.topic}</span>

      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-(--surface-muted)">
        <div
          className="h-full rounded-full bg-(--veridian) transition-[width] duration-500"
          style={{ width: `${topic.rate}%` }}
        />
      </div>

      <span className="w-10 shrink-0 text-right text-xs font-medium">{topic.rate}%</span>

      {/* Direct per-topic action — spec §5.3 requires a button, not just a bar */}
      <Link
        to="/review"
        search={{ topic: topic.topic }}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-(--veridian) opacity-0 no-underline transition-opacity hover:text-(--veridian-strong) group-hover:opacity-100"
        aria-label={`Review ${topic.topic}`}
      >
        Review <ArrowUpRight size={12} />
      </Link>
    </li>
  )
}