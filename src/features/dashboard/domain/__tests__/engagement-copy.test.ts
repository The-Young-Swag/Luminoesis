import { describe, expect, it } from 'vitest'

import { formatCountDelta } from '#/features/dashboard/domain/engagement-copy'
import { headlineForState } from '#/features/dashboard/components/lib/dashboardFormatters'

describe('formatCountDelta', () => {
  it('signs gains and losses against last week', () => {
    expect(formatCountDelta(12, 8)).toBe('+4 vs last week')
    expect(formatCountDelta(5, 9)).toBe('−4 vs last week')
  })

  it('reports steady weeks plainly', () => {
    expect(formatCountDelta(7, 7)).toBe('steady vs last week')
  })
})

describe('headlineForState', () => {
  it('invites an empty library to begin instead of claiming caught-up', () => {
    expect(headlineForState('Insufficient Signal', 0, 0)).toBe(
      'Build your library to begin',
    )
    expect(headlineForState('Steady', 0, 0)).toBe(
      'Build your library to begin',
    )
  })

  it('keeps due and caught-up states once cards exist', () => {
    expect(headlineForState('Steady', 3, 10)).toBe(
      'A focused review is ready when you are',
    )
    expect(headlineForState('Steady', 0, 10)).toBe('You’re all caught up')
  })
})
