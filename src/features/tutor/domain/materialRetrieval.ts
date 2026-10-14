import type { MaterialContentBlock } from '#/features/learning-space/domain/materialContent'
import { expandWithSynonyms, extractKeywords, idfWeights, weightedOverlapScore } from './textRelevance'
import { embedTexts, rankByCosine, withTimeout } from './embeddings'

const MAX_RELEVANT_BLOCKS = 3
const MAX_CACHED_MATERIALS = 20

type ChunkIndex = {
  fingerprint: string
  keywords: Set<string>[]
}

const chunkIndexes = new Map<string, ChunkIndex>()

function fingerprintBlocks(blocks: MaterialContentBlock[]): string {
  const first = blocks[0]?.text.slice(0, 64) ?? ''
  const last = blocks[blocks.length - 1]?.text.slice(-64) ?? ''
  return `${blocks.length}:${first.length}:${last.length}:${first}:${last}`
}

const scheduleWork: (work: () => void) => void =
  typeof requestIdleCallback === 'function'
    ? (work) => requestIdleCallback(() => work())
    : (work) => {
        window.setTimeout(work, 0)
      }

/*
 * Pre-tokenize a material's blocks in the background (called after
 * extraction) so asking never pays tokenization twice. Bounded and
 * self-invalidating via fingerprint — content edits rebuild on next ask.
 */
export function precomputeChunkIndex(key: string, blocks: MaterialContentBlock[]): void {
  scheduleWork(() => {
    if (chunkIndexes.size >= MAX_CACHED_MATERIALS) {
      const oldest = chunkIndexes.keys().next()
      if (!oldest.done) chunkIndexes.delete(oldest.value)
    }
    chunkIndexes.set(key, {
      fingerprint: fingerprintBlocks(blocks),
      keywords: blocks.map((block) => extractKeywords(block.text)),
    })
  })
}

function blockKeywords(
  key: string | undefined,
  blocks: MaterialContentBlock[],
): Set<string>[] | null {
  if (!key) return null
  const entry = chunkIndexes.get(key)
  if (
    !entry ||
    entry.fingerprint !== fingerprintBlocks(blocks) ||
    entry.keywords.length !== blocks.length
  ) {
    return null
  }
  return entry.keywords
}

/**
 * Turns raw, extracted material content into the excerpt that's actually
 * relevant to what the learner is asking. This is the "Material
 * Retrieval" step: a simple keyword search over the material's own
 * blocks, instead of a fixed slice of wherever the document happens to
 * start — which previously meant a question about page 12 could never be
 * grounded, because the excerpt was always page 1.
 *
 * Returns '' when nothing in the material relates to the topic. That's
 * intentional: TutorContext and the provider both treat an empty excerpt
 * as "the material doesn't cover this," which is the honest outcome —
 * not a fallback to an arbitrary, unrelated chunk of the document.
 */
export function scoreBlocksByKeyword(
  blocks: MaterialContentBlock[],
  topic: string,
  options?: { boostFirstPage?: boolean },
): Array<{ index: number; score: number }> {
  const topicKeywords = expandWithSynonyms(extractKeywords(topic))

  if (topicKeywords.size === 0 || blocks.length === 0) {
    return []
  }

  const blockSets = blocks.map((block) => extractKeywords(block.text))
  const weights = idfWeights(blockSets)

  return blocks
    .map((_, index) => ({
      index,
      score: weightedOverlapScore(
        topicKeywords,
        blockSets[index] as Set<string>,
        weights,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .map((entry) => ({
      ...entry,
      score:
        entry.score +
        (options?.boostFirstPage && entry.index === 0 ? FIRST_PAGE_BONUS : 0),
    }))
}

/*
 * First-page bonus, document-info questions only: covers and title pages
 * live at index 0. Applied only when the first chunk already matched, so
 * an irrelevant cover can never ride the bonus into the excerpt. The
 * MiniLM re-rank below is deliberately untouched.
 */
const FIRST_PAGE_BONUS = 1.0

export function selectRelevantMaterialExcerpt(
  blocks: MaterialContentBlock[],
  topic: string,
  maxChars: number,
  materialKey?: string,
  options?: { boostFirstPage?: boolean },
): string {
  const topicKeywords = expandWithSynonyms(extractKeywords(topic))

  if (topicKeywords.size === 0 || blocks.length === 0) {
    return ''
  }

  const keywordSets =
    blockKeywords(materialKey, blocks) ??
    blocks.map((block) => extractKeywords(block.text))
  const weights = idfWeights(keywordSets)

  const scoredBlocks = blocks
    .map((block, index) => ({
      block,
      index,
      score: weightedOverlapScore(
        topicKeywords,
        keywordSets[index] as Set<string>,
        weights,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .map((entry) => ({
      ...entry,
      score:
        entry.score +
        (options?.boostFirstPage && entry.index === 0 ? FIRST_PAGE_BONUS : 0),
    }))

  if (scoredBlocks.length === 0) {
    return ''
  }

  // Take the highest-scoring blocks, but put them back in their original
  // document order so the excerpt reads as a coherent passage rather than
  // a shuffled bag of fragments.
  const selectedBlocks = [...scoredBlocks]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RELEVANT_BLOCKS)
    .sort((a, b) => a.index - b.index)

  const excerpt = selectedBlocks.map((entry) => entry.block.text).join('\n\n')

  return excerpt.slice(0, maxChars)
}

const SEMANTIC_CANDIDATE_BLOCKS = 12
const SEMANTIC_TIMEOUT_MS = 12000

/*
 * Semantic retrieval: keyword prefilter narrows to a dozen candidates,
 * embeddings pick the top 3 by meaning. Returns null when embeddings
 * are unavailable or too slow — the caller falls back to keywords.
 */
export async function selectSemanticExcerpt(
  blocks: MaterialContentBlock[],
  topic: string,
  maxChars: number,
  options?: { boostFirstPage?: boolean },
): Promise<string | null> {
  if (blocks.length === 0 || topic.trim().length === 0) return null

  const candidates = [...scoreBlocksByKeyword(blocks, topic, options)]
    .sort((a, b) => b.score - a.score)
    .slice(0, SEMANTIC_CANDIDATE_BLOCKS)

  if (candidates.length === 0) return null

  const vectors = await withTimeout(
    embedTexts([topic, ...candidates.map((entry) => blocks[entry.index]?.text ?? '')]),
    SEMANTIC_TIMEOUT_MS,
  ).catch(() => null)

  if (!vectors || vectors.length < 2) return null

  const [topicVector, ...chunkVectors] = vectors as [number[], ...number[][]]
  const blockIndexes = rankByCosine(topicVector, chunkVectors, MAX_RELEVANT_BLOCKS)
    .map((candidateIndex) => candidates[candidateIndex]?.index ?? -1)
    .filter((blockIndex) => blockIndex >= 0)
    .sort((a, b) => a - b)

  const excerpt = blockIndexes
    .map((blockIndex) => blocks[blockIndex]?.text ?? '')
    .filter((text) => text.length > 0)
    .join('\n\n')

  return excerpt.length > 0 ? excerpt.slice(0, maxChars) : null
}
