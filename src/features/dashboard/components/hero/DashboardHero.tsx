import { Link } from '@tanstack/react-router'
import { ArrowUpRight, GraduationCap } from 'lucide-react'

import { gainFrameDue, ownershipCue } from '#/features/dashboard/domain/engagement-copy'

import { CornerBrackets } from '#/features/dashboard/components/layout/CornerBrackets'
import { headlineForState, stateDot } from '#/features/dashboard/components/lib/dashboardFormatters'

import { HeroGlow } from './HeroGlow'

type DashboardHeroProps = {
  learningState: { state: string; reason: string }
  sessionCount: number
  dueTodayCount: number
}

export function DashboardHero({ learningState, sessionCount, dueTodayCount }: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-(--line) bg-(--surface-raised) p-5 md:p-8">
      <CornerBrackets />
      <HeroGlow />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--surface-muted) py-1 pl-1.5 pr-3">
            <span className={`h-2.5 w-2.5 rounded-full ${stateDot(learningState.state)}`} />
            <span className="mono-label">{learningState.state}</span>
          </div>

          <p className="mt-2 font-mono text-xs text-(--ink-faint)">— {ownershipCue(sessionCount)}</p>

          <h1 className="display mt-3 text-3xl tracking-tight md:text-4xl">
            {headlineForState(learningState.state, dueTodayCount)}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-(--ink-soft)">{learningState.reason}</p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row lg:flex-col lg:items-end">
          <Link
            to="/review"
            className="btn-primary group inline-flex items-center justify-center gap-2 no-underline transition-shadow hover:shadow-[0_0_24px_-4px_var(--veridian)]"
          >
            <GraduationCap size={16} />
            Start focused review
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>

          <span className="text-center font-mono text-[11px] text-(--ink-faint) lg:text-right">
            {gainFrameDue(dueTodayCount)}
          </span>
        </div>
      </div>
    </section>
  )
}
