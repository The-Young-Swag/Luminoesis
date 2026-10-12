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
