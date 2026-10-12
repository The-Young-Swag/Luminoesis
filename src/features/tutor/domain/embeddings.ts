import { getSharedTutorWorker } from '../workers/tutorWorkerClient'

/*
 * On-device embeddings for semantic retrieval. The embedder (~90MB)
 * loads lazily inside the shared worker on first use; every caller
 * races a timeout and falls back to keyword scoring, so a missing or
 * slow model never blocks an answer.
 */

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const worker = getSharedTutorWorker()
  if (!worker || texts.length === 0) return null

  try {
    return await worker.embed(texts)
  } catch {
    return null
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0

  for (let index = 0; index < length; index++) {
    const x = a[index] ?? 0
    const y = b[index] ?? 0
    dot += x * y
    normA += x * x
    normB += y * y
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/** Indices of the `count` most similar chunks, back in document order. */
export function rankByCosine(
  topicVector: number[],
  chunkVectors: number[][],
  count: number,
): number[] {
  return chunkVectors
    .map((vector, index) => ({
      index,
      score: cosineSimilarity(topicVector, vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.index)
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer = 0
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Timed out')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timer)
  })
}
