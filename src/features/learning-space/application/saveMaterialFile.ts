import { materialFileRepository } from '#/features/learning-space/repositories/materialFileRepository'

/**
 * Persists the original uploaded file so the Read pane can preview it after
 * reload. This is best-effort: if it fails, extraction can still proceed —
 * the Read pane just falls back to showing extracted text instead of the
 * original document.
 */
export async function saveMaterialFile(materialId: string, file: File): Promise<void> {
  await materialFileRepository.save({
    materialId,
    blob: file,
    mimeType: file.type || 'application/octet-stream',
    updatedAt: Date.now(),
  })
}