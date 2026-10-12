import { describe, expect, it } from 'vitest'

import { formatDueDate, formatRelativeDue, formatRelativeTime } from '#/shared/lib/dates'

function isoDaysFromToday(offset: number): string {
  const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

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

describe('formatRelativeDue', () => {
  it('groups overdue into days then weeks with warn tone', () => {
    expect(formatRelativeDue(isoDaysFromToday(-3))).toEqual({
      label: '3d overdue',
      tone: 'warn',
    })
    expect(formatRelativeDue(isoDaysFromToday(-21))).toEqual({
      label: '3 wks overdue',
      tone: 'warn',
    })
  })

  it('labels today, tomorrow, and future plainly', () => {
    expect(formatRelativeDue(isoDaysFromToday(0)).label).toBe('Today')
    expect(formatRelativeDue(isoDaysFromToday(1)).label).toBe('Tomorrow')
    expect(formatRelativeDue(isoDaysFromToday(4))).toEqual({
      label: 'In 4 days',
      tone: 'neutral',
    })
  })
})

describe('formatRelativeTime', () => {
  it('renders fresh activity relatively', () => {
    expect(formatRelativeTime(Date.now())).toBe('just now')
    expect(formatRelativeTime(Date.now() - 3 * 60 * 1000)).toBe('3m ago')
    expect(formatRelativeTime(Date.now() - 5 * 60 * 60 * 1000)).toBe('5h ago')
  })
})
