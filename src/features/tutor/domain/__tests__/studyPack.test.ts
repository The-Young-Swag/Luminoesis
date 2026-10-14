import { describe, expect, it } from 'vitest'

import { parseStudyPack } from '../studyPack'

function validPayload() {
  return {
    summary: 'Memory works in stages. Short-term fades fast. Repeating moves facts along.',
    concepts: [
      { term: 'Short-term memory', explanation: 'Holds information briefly.', example: 'A phone number' },
      { term: 'Long-term memory', explanation: 'Stores information for years.' },
      { term: 'Rehearsal', explanation: 'Repeating moves facts along.' },
    ],
    questions: [
      { question: 'How long does short-term memory last?', answer: 'About 20 seconds' },
      { question: 'What moves facts to long-term memory?', answer: 'Repeating them' },
      { question: 'How long can long-term memory last?', answer: 'Years' },
      { question: 'What fades fast?', answer: 'Short-term memory' },
      { question: 'What is rehearsal?', answer: 'Repeating information' },
    ],
    misconceptions: ['Cramming beats spacing'],
  }
}

describe('parseStudyPack', () => {
  it('accepts valid JSON', () => {
    const pack = parseStudyPack(JSON.stringify(validPayload()), 'mat-1', 'gemini-3.5-flash')
    expect(pack).not.toBeNull()
    expect(pack?.materialId).toBe('mat-1')
    expect(pack?.version).toBe(1)
    expect(pack?.model).toBe('gemini-3.5-flash')
    expect(pack?.concepts).toHaveLength(3)
    expect(pack?.questions).toHaveLength(5)
    expect(typeof pack?.generatedAt).toBe('number')
  })

  it('strips ```json fences', () => {
    const pack = parseStudyPack(`\`\`\`json\n${JSON.stringify(validPayload())}\n\`\`\``, 'mat-1', 'm')
    expect(pack).not.toBeNull()
    expect(pack?.summary.startsWith('Memory works')).toBe(true)
  })

  it('returns null for malformed JSON without throwing', () => {
    expect(parseStudyPack('not json at all {{{', 'mat-1', 'm')).toBeNull()
    expect(parseStudyPack('', 'mat-1', 'm')).toBeNull()
    expect(parseStudyPack('[1,2,3]', 'mat-1', 'm')).toBeNull()
  })

  it('returns null for missing fields', () => {
    const missingSummary = validPayload() as Record<string, unknown>
    delete missingSummary.summary
    expect(parseStudyPack(JSON.stringify(missingSummary), 'mat-1', 'm')).toBeNull()

    expect(parseStudyPack(JSON.stringify({ summary: 'x' }), 'mat-1', 'm')).toBeNull()
  })

  it('returns null for too few concepts or questions', () => {
    const payload = validPayload()
    payload.concepts = payload.concepts.slice(0, 2)
    expect(parseStudyPack(JSON.stringify(payload), 'mat-1', 'm')).toBeNull()

    const payload2 = validPayload()
    payload2.questions = payload2.questions.slice(0, 4)
    expect(parseStudyPack(JSON.stringify(payload2), 'mat-1', 'm')).toBeNull()
  })

  it('trims over-cap arrays and drops blank entries', () => {
    const payload = validPayload()
    payload.concepts = [
      ...payload.concepts,
      ...Array.from({ length: 15 }, (_, i) => ({ term: `Extra ${i}`, explanation: 'Filler.' })),
      { term: '   ', explanation: 'Blank term.' },
    ]
    payload.questions = [
      ...payload.questions,
      ...Array.from({ length: 15 }, (_, i) => ({ question: `Extra ${i}?`, answer: 'Filler.' })),
    ]
    payload.misconceptions = Array.from({ length: 10 }, (_, i) => `Myth ${i}`)
    const pack = parseStudyPack(JSON.stringify(payload), 'mat-1', 'm')
    expect(pack?.concepts).toHaveLength(12)
    expect(pack?.questions).toHaveLength(12)
    expect(pack?.misconceptions).toHaveLength(6)
    expect(pack?.concepts.every((c) => c.term.trim().length > 0)).toBe(true)
  })
})
