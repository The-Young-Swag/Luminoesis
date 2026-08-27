/**
 * Canonical, persisted readable content for a Material.
 *
 * Content is intentionally a separate entity from `Material` metadata so that
 * small, frequently-read metadata (title, source, status) stays cheap to load
 * in lists and workspaces, while potentially large content is only fetched when
 * the reader actually renders it.
 *
 * The same representation is the target for both user-provided/local content
 * today and the future extraction pipeline (PDF/Markdown/etc.) tomorrow. The
 * `source` field records which path populated it so provenance stays honest.
 */

export type MaterialContentBlockType = 'heading' | 'paragraph' | 'list-item'

export type MaterialContentBlock = {
  id: string
  type: MaterialContentBlockType
  text: string
}

export type MaterialContentSource = 'user' | 'extracted'

export type MaterialContent = {
  materialId: string
  blocks: MaterialContentBlock[]
  source: MaterialContentSource
  updatedAt: number
}

export function isMaterialContentEmpty(content: MaterialContent | undefined): boolean {
  if (!content) {
    return true
  }

  return content.blocks.every((block) => block.text.trim().length === 0)
}
