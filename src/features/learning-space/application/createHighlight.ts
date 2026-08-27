import { z } from 'zod'

import {
  createHighlightId,
} from '#/features/learning-space/domain/ids'
import type {
  Highlight,
  MaterialLocator,
} from '#/features/learning-space/domain/learningSpace'
import { highlightRepository } from '#/features/learning-space/repositories/highlightRepository'

const LocatorSchema = z.object({
  kind: z.enum(['pdf', 'image', 'slide', 'text']),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().nonnegative().optional(),
  page: z.number().int().nonnegative().optional(),
})

const CreateHighlightSchema = z.object({
  learningSpaceId: z.string().trim().min(1),
  materialId: z.string().trim().min(1),
  text: z.string().trim().min(1),
  conceptId: z.string().trim().min(1).optional(),
  note: z.string().trim().min(1).optional(),
  locator: LocatorSchema.optional(),
})

export type CreateHighlightInput = z.input<
  typeof CreateHighlightSchema
>

/**
 * Persist a Highlight captured from a selection in the Material Viewer.
 *
 * Provenance is preserved explicitly: `materialId` and `learningSpaceId` are
 * always recorded, and `conceptId` is attached when the highlight is captured
 * within (or later linked to) a Concept. The `text` stores the exact selected
 * passage so the source is always answerable.
 */
export async function createHighlight(
  input: CreateHighlightInput,
): Promise<Highlight> {
  const data = CreateHighlightSchema.parse(input)
  const now = Date.now()

  const locator: MaterialLocator = data.locator
    ? (data.locator as MaterialLocator)
    : { kind: 'text', startOffset: 0, endOffset: data.text.length }

  const highlight: Highlight = {
    id: createHighlightId(),
    learningSpaceId: data.learningSpaceId,
    materialId: data.materialId,
    text: data.text,
    conceptId: data.conceptId,
    note: data.note,
    locator,
    createdAt: now,
  }

  await highlightRepository.create(highlight)

  return highlight
}
