/**
 * The original file the learner uploaded, persisted as a Blob so the Read
 * pane can render a faithful preview after reload.
 *
 * This is intentionally separate from `MaterialContent`: this table exists
 * purely for visual preview, `MaterialContent` exists purely for the
 * learning features (Tutor, Concepts, Highlights, Flashcards, Quiz).
 */
export type MaterialFileRecord = {
  materialId: string
  blob: Blob
  mimeType: string
  updatedAt: number
}