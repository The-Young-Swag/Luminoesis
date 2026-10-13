import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'

export function InsightBanner({ text, stat }: { text: string; stat: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-(--veridian)/20 bg-(--veridian-muted) p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-(--accent) text-(--accent-ink)">
          <Sparkles size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{text}</p>
          <p className="mt-1 text-xs leading-5 text-(--ink-soft)">{stat}</p>
        </div>

        <Link
          to="/insights"
          aria-label="View insights"
          className="btn-ghost shrink-0 no-underline"
        >
          View insights
        </Link>
      </div>
    </section>
  )
}
