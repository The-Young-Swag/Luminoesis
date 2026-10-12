type BadgeProps = {
  tone?: 'neutral' | 'accent' | 'warn' | 'danger'
  children: React.ReactNode
}

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'border-(--line) bg-(--surface-muted) text-(--ink-soft)',
  accent: 'border-(--accent-line) bg-(--accent-soft) text-(--ink)',
  warn: 'border-(--warning)/30 bg-(--warning-muted) text-(--warning-strong)',
  danger:
    'border-(--destructive)/25 bg-(--destructive)/10 text-(--destructive)',
}

/*
 * Single badge for counts, statuses, and relative-date chips.
 * Sentence case, tabular numerals, 4.5:1 text via the ramp.
 */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`chip ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
