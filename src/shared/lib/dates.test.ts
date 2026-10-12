import { describe, expect, it } from 'vitest'

import { formatDueDate } from '#/shared/lib/dates'

describe('formatDueDate', () => {
  it('formats YYYY-MM-DD with the locale short form', () => {
    const formatted = formatDueDate('2026-08-21')

    expect(formatted).toContain('Aug')
    expect(formatted).toContain('21')
    expect(formatted).not.toBe('2026-08-21')
  })

  it('falls back to the raw string when unparseable', () => {
    expect(formatDueDate('not-a-date')).toBe('not-a-date')
  })
})
