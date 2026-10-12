/**
 * Format a YYYY-MM-DD date for display using the user's locale.
 * Falls back to the raw string when parsing fails.
 */
export function formatDueDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return isoDate
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

export type RelativeDueTone = 'warn' | 'neutral'

/*
 * Relative, grouped due labels — "7 wks overdue", "Today", "Tomorrow",
 * "In 3 days". Never a raw ISO string in the UI.
 */
export function formatRelativeDue(isoDate: string): {
  label: string
  tone: RelativeDueTone
} {
  const dayMs = 24 * 60 * 60 * 1000
  const startOf = (time: number) => {
    const date = new Date(time)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }

  const parsed = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return { label: isoDate, tone: 'neutral' }
  }

  const days = Math.round((startOf(parsed.getTime()) - startOf(Date.now())) / dayMs)

  if (days < -13) {
    const weeks = Math.round(-days / 7)
    return { label: `${weeks} wk${weeks === 1 ? '' : 's'} overdue`, tone: 'warn' }
  }
  if (days < 0) {
    return { label: `${-days}d overdue`, tone: 'warn' }
  }
  if (days === 0) return { label: 'Today', tone: 'neutral' }
  if (days === 1) return { label: 'Tomorrow', tone: 'neutral' }
  return { label: `In ${days} days`, tone: 'neutral' }
}

/*
 * Relative timestamps for activity feeds — "just now", "3h ago",
 * "Yesterday", "Mar 4". Falls back to locale date far out.
 */
export function formatRelativeTime(timestamp: string | number): string {
  const time = new Date(timestamp).getTime()
  if (Number.isNaN(time)) return ''

  const minutes = Math.round((Date.now() - time) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(time))
}
