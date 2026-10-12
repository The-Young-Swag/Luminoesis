import { Lightbulb } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { PageHeader } from '#/shared/components/ui/PageHeader'
import { useInsights } from '#/features/insights/hooks/useInsights'

export function InsightsPage() {
  const { data } = useInsights()

  if (!data) {
    return (
      <div className="page-wrap py-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading insights…</span>

        <div className="skeleton h-3 w-32" />
        <div className="skeleton mt-3 h-7 w-64" />
        <div className="skeleton mt-2 h-4 w-80 max-w-full" />

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card-flat p-5">
            <div className="skeleton h-4 w-36" />
            <div className="skeleton mt-4 h-24 w-full" />
          </div>
          <div className="card-flat p-5">
            <div className="skeleton h-4 w-48" />
            <div className="skeleton mt-4 h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  const { retention, lengthPerf, pattern } = data

  return (
    <div className="page-wrap space-y-4 py-6 md:py-8">
      <PageHeader
        title="Insights"
        context="On this device only · no streaks, no guilt"
      />

      {pattern && (
        <div className="card-flat mt-6 flex items-start gap-3 border-(--warning)/30 bg-(--warning-muted) p-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-(--warning) text-white">
            <Lightbulb size={16} aria-hidden="true" />
          </span>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-(--warning-strong)">
              Most actionable pattern
            </div>

            <div className="mt-1 text-[15px] font-semibold text-(--ink)">
              {pattern.text}
            </div>

            <div className="mt-1 text-sm text-(--ink-soft)">{pattern.stat}</div>
          </div>
        </div>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-flat p-5">
          <h2 className="text-sm font-semibold">Retention by topic</h2>

          <p className="text-xs text-(--ink-faint)">
            Correct / total — Good or Easy counts as correct.
          </p>

          {retention.length === 0 ? (
            <div className="mt-4 rounded-xl border border-(--line) bg-(--surface-muted) p-4">
              <p className="text-sm font-medium text-(--ink)">
                No patterns yet
              </p>
              <p className="mt-1 text-sm text-(--ink-soft)">
                Add cards and complete a few reviews — your retention
                by topic will appear here.
              </p>
              <Link
                to="/library"
                className="btn-primary mt-3 inline-flex no-underline"
              >
                Add study cards
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-1">
              {retention.map((item) => {
                const percentage = Math.round(item.rate * 100)

                return (
                  <div
                    key={item.topic}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-32 truncate font-medium">
                      {item.topic}
                    </span>

                    <div
                      role="progressbar"
                      aria-label={`${item.topic} retention`}
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-2 flex-1 overflow-hidden rounded-full bg-(--surface-muted)"
                    >
                      <div
                        className="h-full rounded-full bg-(--veridian)"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <span className="w-16 text-right text-xs tabular-nums text-(--ink-faint)">
                      {percentage}% · {item.correct}/{item.total}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card-flat p-5">
          <h2 className="text-sm font-semibold">
            Session length vs performance
          </h2>

          <p className="text-xs text-(--ink-faint)">
            Average grade by bucket — visual, not numeric-obsessive.
          </p>

          <div className="mt-4 grid gap-2">
            {lengthPerf.map((item) => {
              const performance = item.reviewCount
                ? (item.averageGrade / 3) * 100
                : 0

                return (
                  <div
                    key={item.sessionId}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-16 text-xs font-medium tabular-nums text-(--ink-faint)">
                      {item.durationMinutes.toFixed(0)}m
                    </span>

                    <div
                      role="progressbar"
                      aria-label={`${item.durationMinutes.toFixed(0)} minute sessions performance`}
                      aria-valuenow={Math.round(performance)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-2 flex-1 overflow-hidden rounded-full bg-(--surface-muted)"
                    >
                      <div
                        className="h-full rounded-full bg-(--veridian)"
                        style={{ width: `${performance}%` }}
                      />
                    </div>

                    <span className="text-xs tabular-nums text-(--ink-faint)">
                      {item.reviewCount
                        ? `${item.averageGrade.toFixed(1)}/3`
                        : '—'}{' '}
                      · {item.reviewCount} sessions
                    </span>
                  </div>
                )
            })}
          </div>
        </div>
      </section>

      <section className="card-flat mt-4 p-5">
        <h2 className="text-sm font-semibold">What this means</h2>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-(--ink-soft)">
          <li>
            If early retention is higher, schedule new material in shorter
            bursts (15–20m) rather than one long session.
          </li>

          <li>
            If 45m+ bucket underperforms, let adaptive mode route harder cards
            to your peak window (learned from baseline deviation).
          </li>

          <li>
            All insight is derived locally — export or delete anytime in
            Privacy.
          </li>
        </ul>
      </section>
    </div>
  )
}