import type { TutorContext } from './tutor'
import { truncate, MAX_CONTEXT_CHARS, MAX_SELECTED_TEXT_CHARS } from './tutor'
import { materialContentRepository } from '#/features/learning-space/repositories/materialContentRepository'
import { conceptRepository } from '#/features/learning-space/repositories/conceptRepository'
import { highlightRepository } from '#/features/learning-space/repositories/highlightRepository'
import { reviewEventRepository } from '#/features/review/repositories/reviewEventRepository'
import { retentionByConcept } from '#/features/insights/domain/analytics'

/**
 * Builds a provider-independent learning context.
 *
 * This is the single place that assembles material content, selected text,
 * concepts, highlights, review history, and weak spots — so both
 * LocalTutorProvider and GeminiTutorProvider receive the same grounded
 * payload without duplicating query logic.
 */
export type BuildTutorContextInput = {
  materialId?: string
  materialTitle?: string
  selectedText?: string
  learningSpaceId: string
  prompt: string
}

export async function buildTutorContext(
  input: BuildTutorContextInput,
): Promise<TutorContext> {
  const { materialId, materialTitle, selectedText, learningSpaceId, prompt } = input

  const [materialContent, concepts, highlights, reviewEvents] = await Promise.all([
    materialId ? materialContentRepository.findByMaterialId(materialId) : Promise.resolve(undefined),
    conceptRepository.findByLearningSpaceId(learningSpaceId),
    materialId ? highlightRepository.findByMaterialId(materialId) : Promise.resolve([]),
    reviewEventRepository.findAll(),
  ])

  const excerpt = materialContent
    ? materialContent.blocks
        .map((block) => block.text)
        .join('\n\n')
        .slice(0, MAX_CONTEXT_CHARS)
    : ''

  const truncatedSelected = selectedText
    ? truncate(selectedText.trim(), MAX_SELECTED_TEXT_CHARS)
    : undefined

  // Weak spots: concepts with lowest retention that have at least 3 reviews
  const retention = retentionByConcept(reviewEvents, concepts)
  const weakSpots = retention
    .filter((item) => item.total >= 3)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3)
    .map((item) => {
      const concept = concepts.find((concept) => concept.name === item.topic)
      return {
        conceptId: concept?.id ?? item.topic,
        conceptName: item.topic,
        rate: item.rate,
        total: item.total,
      }
    })

  // Review history: last 10 events enriched with concept names
  const nameById = new Map(concepts.map((concept) => [concept.id, concept.name]))
  const reviewHistory = [...reviewEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
    .map((event) => ({
      conceptId: event.conceptId,
      conceptName: nameById.get(event.conceptId) ?? 'General',
      grade: event.grade,
      timestamp: event.timestamp,
    }))

  return {
    material: materialId && materialTitle
      ? {
          id: materialId,
          title: materialTitle,
          excerpt: excerpt.length > 0 ? excerpt : truncatedSelected ?? '',
          source: materialContent?.source ?? 'user',
        }
      : undefined,
    selectedText: truncatedSelected,
    concepts: concepts.map((concept) => ({
      id: concept.id,
      name: concept.name,
      description: concept.description,
    })),
    highlights: highlights.slice(0, 6).map((highlight) => ({
      id: highlight.id,
      text: truncate(highlight.text, 200),
      note: highlight.note,
    })),
    reviewHistory,
    weakSpots,
    prompt: prompt.trim(),
  }
}
