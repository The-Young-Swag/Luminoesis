let workerConfigured = false

/**
 * Lazily loads pdfjs-dist and points it at its worker bundle.
 *
 * Kept in one place because both text extraction and the PDF preview
 * renderer need the same setup, and the worker URL resolution is fiddly
 * enough (Vite's `?url` import) that duplicating it invites drift.
 */
export async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')

  if (!workerConfigured) {
    try {
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    } catch {
      // Some bundlers can't resolve the ?url worker import; pdfjs can still
      // run without a dedicated worker for simple documents.
    }
    workerConfigured = true
  }

  return pdfjs
}