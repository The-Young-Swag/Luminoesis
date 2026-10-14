import { describe, expect, it } from 'vitest'

import type { MaterialContentBlock } from '#/features/learning-space/domain/materialContent'
import {
  selectRelevantMaterialExcerpt,
  scoreBlocksByKeyword,
} from '../materialRetrieval'
import {
  expandWithSynonyms,
  extractKeywords,
  idfWeights,
} from '../textRelevance'

function block(id: string, text: string): MaterialContentBlock {
  return { id, type: 'paragraph', text }
}

/*
 * Synthetic stand-in for the reported failure shape: a cover naming a
 * person (without the word "author"), one bio paragraph, and long
 * acknowledgements stamping the same company name on nearly every chunk.
 * All names are invented. The real PDF is never committed or read here.
 */
const FIXTURE = [
  block('cover', 'Narrative Report. Prepared by Maria Santos. Riverview High School.'),
  block('bio', 'Maria Santos was born in Santa Clara. She is taking a Bachelor of Science in Biology degree. She served as president of the student science organization.'),
  block('ack1', 'The writer thanks the Acme Team for guidance during the field study report.'),
  block('ack2', 'The writer thanks Acme Philippines and the Field Operations Team for their support.'),
  block('ack3', 'The writer thanks the Supply Chain and Logistics Team at Acme for the supplies.'),
  block('ack4', 'The study was conducted with the Acme Team. Acme provided the site.'),
]

describe('retrieval ranking: idf', () => {
  it('weights a stamped company name near zero and a rare word highly', () => {
    const sets = FIXTURE.map((entry) => extractKeywords(entry.text))
    const weights = idfWeights(sets)
    const acme = weights.get('acme') ?? Number.NaN
    const prepared = weights.get('prepared') ?? Number.NaN
    expect(acme).toBeCloseTo(Math.log(6 / 4), 5)
    expect(prepared).toBeCloseTo(Math.log(6 / 1), 5)
    expect(prepared).toBeGreaterThan(acme)
  })

  it('falls back to weight 1 for a single chunk instead of going blind', () => {
    const weights = idfWeights([extractKeywords('only chunk here')])
    for (const weight of weights.values()) expect(weight).toBe(1)
  })
})

describe('retrieval ranking: synonyms', () => {
  it('expands document-about-document words only', () => {
    expect(expandWithSynonyms(new Set(['authored']))).toContain('prepared')
    expect(expandWithSynonyms(new Set(['title']))).toContain('called')
    const plain = expandWithSynonyms(new Set(['memory']))
    expect(plain.size).toBe(1)
    expect(plain.has('memory')).toBe(true)
  })
})

describe('retrieval ranking: cover beats the acknowledgement pile', () => {
  it('ranks the cover first for an authorship question', () => {
    const ranked = scoreBlocksByKeyword(FIXTURE, 'who authored this report')
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0]?.index).toBe(0)
    const coverScore = ranked[0]?.score ?? 0
    for (const entry of ranked.slice(1)) {
      expect(coverScore).toBeGreaterThan(entry.score)
    }
  })

  it('selects an excerpt naming the person, not the company team', () => {
    const excerpt = selectRelevantMaterialExcerpt(
      FIXTURE,
      'who authored this report',
      4000,
    )
    expect(excerpt).toContain('Maria Santos')
  })

  it('boosts a matched first page only when asked, never a miss', () => {
    const plain = scoreBlocksByKeyword(FIXTURE, 'who authored this report')
    const boosted = scoreBlocksByKeyword(FIXTURE, 'who authored this report', {
      boostFirstPage: true,
    })
    const plainCover = plain.find((entry) => entry.index === 0)?.score ?? 0
    const boostedCover = boosted.find((entry) => entry.index === 0)?.score ?? 0
    expect(boostedCover).toBeGreaterThan(plainCover)

    expect(
      scoreBlocksByKeyword(FIXTURE, 'quantum chromodynamics', {
        boostFirstPage: true,
      }),
    ).toEqual([])
  })
})
