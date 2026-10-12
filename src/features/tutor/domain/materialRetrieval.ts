import type { MaterialContentBlock } from '#/features/learning-space/domain/materialContent'
import { extractKeywords, keywordOverlapScore } from './textRelevance'

const MAX_RELEVANT_BLOCKS = 3

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
export function selectRelevantMaterialExcerpt(
  blocks: MaterialContentBlock[],
  topic: string,
  maxChars: number,
): string {
  const topicKeywords = extractKeywords(topic)

  if (topicKeywords.size === 0 || blocks.length === 0) {
    return ''
  }

  const scoredBlocks = blocks
    .map((block, index) => ({
      block,
      index,
      score: keywordOverlapScore(topicKeywords, block.text),
    }))
    .filter((entry) => entry.score > 0)

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
