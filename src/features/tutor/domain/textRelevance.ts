/**
 * Lightweight, zero-cost keyword relevance — no embeddings, no vector DB,
 * no network call. This is deliberately simple: it's good enough to tell
 * "this text is plausibly about the topic" from "this text is about
 * something else entirely," which is all the material-grounding
 * decisions in the Tutor actually need. It will miss paraphrases (e.g.
 * "Sun" vs "solar") — a known limitation of keyword matching, acceptable
 * for a local, offline-first, zero-cost feature.
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or',
  'is', 'are', 'was', 'were', 'what', 'why', 'how', 'does', 'do', 'this',
  'that', 'it', 'its', 'can', 'you', 'give', 'me', 'about', 'explain',
  'more', 'simply', 'coherently', 'please', 'exact', 'precise', 'material',
  'passage', 'ratio', 'with',
])

export function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  )
}

/**
 * Counts how many of the query's keywords appear anywhere in `text`.
 * Presence-based rather than frequency-weighted — for short material
 * blocks, a keyword appearing once is as meaningful a signal as it
 * appearing three times.
 */
export function keywordOverlapScore(
  queryKeywords: Set<string>,
  text: string,
): number {
  return keywordOverlapScoreSets(queryKeywords, extractKeywords(text))
}

/** Set-against-set variant for pre-tokenized blocks (see chunk index). */
export function keywordOverlapScoreSets(
  queryKeywords: Set<string>,
  docKeywords: Set<string>,
): number {
  if (queryKeywords.size === 0) {
    return 0
  }

  let matches = 0
  for (const word of queryKeywords) {
    if (docKeywords.has(word)) {
      matches += 1
    }
  }

  return matches
}

/*
 * Small, fixed synonym map for document-about-document vocabulary. Only
 * words in this map expand — every other query behaves exactly as before.
 * Purpose: a cover that says "Prepared by Maria Santos" must match "who
 * authored this?", even though neither side shares a literal word.
 */
const QUERY_SYNONYMS: Record<string, string[]> = {
  author: ['authored', 'written', 'prepared', 'submitted', 'wrote'],
  authored: ['author', 'written', 'prepared', 'submitted', 'wrote'],
  written: ['author', 'authored', 'prepared', 'submitted', 'wrote'],
  prepared: ['author', 'authored', 'written', 'submitted'],
  submitted: ['author', 'authored', 'written', 'prepared'],
  wrote: ['author', 'authored', 'written'],
  title: ['titled', 'called', 'named'],
  titled: ['title', 'called', 'named'],
  called: ['title', 'titled', 'named'],
  pages: ['page'],
  page: ['pages'],
}

export function expandWithSynonyms(words: Set<string>): Set<string> {
  const expanded = new Set(words)
  for (const word of words) {
    for (const synonym of QUERY_SYNONYMS[word] ?? []) {
      expanded.add(synonym)
    }
  }
  return expanded
}

/*
 * Inverse document frequency over a material's own chunks: a word present
 * in nearly every chunk (a company name stamped on each page) counts
 * almost nothing; a rare word counts fully. idf(w) = ln(N / df).
 * Single-chunk materials fall back to weight 1 (IDF is meaningless at N=1
 * — everything would score 0 and retrieval would go blind).
 */
export function idfWeights(keywordSets: Set<string>[]): Map<string, number> {
  const documentFrequency = new Map<string, number>()
  for (const set of keywordSets) {
    for (const word of set) {
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1)
    }
  }

  const weights = new Map<string, number>()
  const total = keywordSets.length
  if (total <= 1) {
    for (const word of documentFrequency.keys()) weights.set(word, 1)
    return weights
  }
  for (const [word, frequency] of documentFrequency) {
    weights.set(word, Math.log(total / frequency))
  }
  return weights
}

/** Presence-based overlap, but each match counts its IDF weight. */
export function weightedOverlapScore(
  queryKeywords: Set<string>,
  docKeywords: Set<string>,
  weights: Map<string, number>,
): number {
  if (queryKeywords.size === 0) {
    return 0
  }

  let score = 0
  for (const word of queryKeywords) {
    if (docKeywords.has(word)) {
      score += weights.get(word) ?? 0
    }
  }
  return score
}
