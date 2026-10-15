import { FlaskConical } from 'lucide-react'

/*
 * Honest beta notice: Sophia runs a tiny on-device model, so she is a
 * demo that is not smart enough yet. One slim line on Home — no dismiss,
 * no clutter — so expectations are set before the first question.
 */
export function SophiaBetaNotice() {
  return (
    <p
      role="status"
      className="flex items-center gap-2.5 rounded-2xl border border-(--line) bg-(--surface-muted)/50 px-4 py-2.5 text-[13px] leading-5 text-(--ink-soft)"
    >
      <FlaskConical size={15} aria-hidden="true" className="shrink-0 text-(--accent)" />

      <span className="min-w-0">
        <span className="mr-2 inline-block rounded-full border border-(--accent-line) bg-(--accent-soft) px-2 py-px align-middle text-[11px] font-semibold text-(--ink)">
          Beta
        </span>
        Sophia AI is a demo and isn&apos;t smart enough yet — answers can be
        rough around the edges.
      </span>
    </p>
  )
}
