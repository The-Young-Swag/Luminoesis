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
  if (queryKeywords.size === 0) {
    return 0
  }

  const textKeywords = extractKeywords(text)

  let matches = 0
  for (const word of queryKeywords) {
    if (textKeywords.has(word)) {
      matches += 1
    }
  }

  return matches
}
