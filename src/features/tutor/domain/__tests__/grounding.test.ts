import { describe, expect, it } from 'vitest'

import {
  buildExtractiveAnswer,
  findUngroundedFacts,
} from '../../providers/localTutorProvider'

const SOURCE =
  'Short-term memory holds information for about 20 seconds before it fades. ' +
  'Long-term memory can store information for years with little decay. ' +
  'The field study was supported by the Acme Team.'

describe('findUngroundedFacts', () => {
  it('passes grounded numbers and names', () => {
    expect(
      findUngroundedFacts(
        'Short-term memory lasts about 20 seconds, supported by the Acme Team.',
        SOURCE,
      ),
    ).toEqual([])
  })

  it('flags invented numbers', () => {
    expect(
      findUngroundedFacts('Short-term memory lasts 30 seconds.', SOURCE),
    ).toEqual(['30'])
  })

  it('flags invented multi-word names', () => {
    expect(
      findUngroundedFacts('Support comes from the Syngenta Team today.', SOURCE),
    ).toEqual(['Syngenta Team'])
  })

  it('ignores commas and hyphens when comparing', () => {
    expect(
      findUngroundedFacts('The grant was 1,000 dollars.', 'The grant was 1000 dollars.'),
    ).toEqual([])
    expect(
      findUngroundedFacts(
        'Long Term Memory lasts for years.',
        'Long-term memory lasts for years.',
      ),
    ).toEqual([])
  })

  it('ignores single capitalized words like sentence starts', () => {
    expect(
      findUngroundedFacts('The difference is clear from the text above.', SOURCE),
    ).toEqual([])
  })
})

describe('buildExtractiveAnswer', () => {
  it('quotes the sentences overlapping the question, verbatim', () => {
    const answer = buildExtractiveAnswer(
      'How long does short-term memory last?',
      SOURCE,
    )
    expect(answer).not.toBeNull()
    expect(answer).toContain('20 seconds')
    expect(answer).toContain('quoting directly')
    expect(answer).not.toContain('passage')
  })

  it('returns null when nothing overlaps the question', () => {
    expect(
      buildExtractiveAnswer('What is quantum chromodynamics?', SOURCE),
    ).toBeNull()
  })

  it('returns null for empty sources and empty questions', () => {
    expect(buildExtractiveAnswer('What lasts?', '')).toBeNull()
    expect(buildExtractiveAnswer('???', SOURCE)).toBeNull()
  })
})
