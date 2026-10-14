/*
 * StudyPack — reasoning done ONCE per document (by Gemini, server-side)
 * and stored on the device, so Sophia's weak local model never has to
 * reason at question time. A later milestone will make Sophia consume
 * these packs. This file is pure: no network, no Dexie, never throws.
 */

export type StudyPackConcept = {
  term: string
  explanation: string
  example?: string
}

export type StudyPackQuestion = {
  question: string
  answer: string
}

export type StudyPack = {
  materialId: string
  version: 1
  generatedAt: number
  model: string
  summary: string
  concepts: StudyPackConcept[]
  questions: StudyPackQuestion[]
  misconceptions: string[]
}

const MAX_CONCEPTS = 12
const MAX_QUESTIONS = 12
const MAX_MISCONCEPTIONS = 6
const MIN_CONCEPTS = 3
const MIN_QUESTIONS = 5

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanConcept(value: unknown): StudyPackConcept | null {
  if (value === null || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const term = cleanString(record.term)
  const explanation = cleanString(record.explanation)
  if (term === null || explanation === null) return null
  const example = cleanString(record.example)
  return example === null ? { term, explanation } : { term, explanation, example }
}

function cleanQuestion(value: unknown): StudyPackQuestion | null {
  if (value === null || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const question = cleanString(record.question)
  const answer = cleanString(record.answer)
  if (question === null || answer === null) return null
  return { question, answer }
}

/*
 * Parse Gemini's raw text into a validated StudyPack. Returns null for
 * anything unusable (malformed JSON, missing fields, too few concepts
 * or questions). Strips ```json fences first. Never throws — callers
 * treat null as "no pack" and move on.
 */
export function parseStudyPack(
  raw: string,
  materialId: string,
  model: string,
): StudyPack | null {
  try {
    const unfenced = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    const parsed: unknown = JSON.parse(unfenced)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    const record = parsed as Record<string, unknown>

    const summary = cleanString(record.summary)
    if (summary === null) return null

    const rawConcepts = Array.isArray(record.concepts) ? record.concepts : []
    const concepts = rawConcepts
      .map(cleanConcept)
      .filter((entry): entry is StudyPackConcept => entry !== null)
      .slice(0, MAX_CONCEPTS)
    if (concepts.length < MIN_CONCEPTS) return null

    const rawQuestions = Array.isArray(record.questions) ? record.questions : []
    const questions = rawQuestions
      .map(cleanQuestion)
      .filter((entry): entry is StudyPackQuestion => entry !== null)
      .slice(0, MAX_QUESTIONS)
    if (questions.length < MIN_QUESTIONS) return null

    const rawMisconceptions = Array.isArray(record.misconceptions)
      ? record.misconceptions
      : []
    const misconceptions = rawMisconceptions
      .map(cleanString)
      .filter((entry): entry is string => entry !== null)
      .slice(0, MAX_MISCONCEPTIONS)

    return {
      materialId,
      version: 1,
      generatedAt: Date.now(),
      model,
      summary,
      concepts,
      questions,
      misconceptions,
    }
  } catch {
    return null
  }
}
