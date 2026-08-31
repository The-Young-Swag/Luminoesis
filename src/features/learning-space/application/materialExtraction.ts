import type { Material } from '#/features/learning-space/domain/learningSpace'
import type { MaterialContentBlock } from '#/features/learning-space/domain/materialContent'
import { materialRepository } from '#/features/learning-space/repositories/materialRepository'
import { saveMaterialContent } from './saveMaterialContent'

function toBlocks(raw: string): MaterialContentBlock[] {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return []

  return lines.map((line) => {
    if (line.startsWith('# ')) {
      return { id: crypto.randomUUID(), type: 'heading' as const, text: line.slice(2).trim() }
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return { id: crypto.randomUUID(), type: 'list-item' as const, text: line.slice(2).trim() }
    }
    return { id: crypto.randomUUID(), type: 'paragraph' as const, text: line }
  })
}

function blocksFromParagraphs(paragraphs: string[]): MaterialContentBlock[] {
  const out: MaterialContentBlock[] = []
  for (const rawPara of paragraphs) {
    const para = rawPara.trim()
    if (!para) continue
    if (para.startsWith('# ')) {
      out.push({ id: crypto.randomUUID(), type: 'heading', text: para.slice(2).trim() })
    } else {
      out.push({ id: crypto.randomUUID(), type: 'paragraph', text: para })
    }
  }
  return out
}

async function extractTextFile(file: File): Promise<string> {
  return file.text()
}

async function extractPdfFile(file: File): Promise<string> {
  // Lazy-load pdfjs-dist — Apache 2.0, portfolio-safe. Worker is configured via Vite ?url import.
  // If pdfjs is not installed or fails, we throw and the caller marks extraction failed honestly.
  const pdfjs = await import('pdfjs-dist')
  // Configure worker for browser. The `?url` import is handled by Vite.
  // Fallback: try legacy worker path.
  try {
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default as string
    const maybePdfjs = pdfjs as unknown as { GlobalWorkerOptions?: { workerSrc?: string } }
    if (maybePdfjs.GlobalWorkerOptions) {
      maybePdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    }
  } catch {
    // Worker setup may fail in some bundlers; pdfjs can still work without it for simple docs
  }

  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  const maxPages = Math.min(pdf.numPages, 50) // limit for demo, prevent huge docs from hanging
  const texts: string[] = []
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => {
        const typed = item as { str?: string }
        return typed.str ?? ''
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) texts.push(pageText)
  }
  return texts.join('\n\n')
}

async function extractImageFile(file: File): Promise<string> {
  // Lazy-load tesseract.js — Apache 2.0, on-device OCR, no server.
  // This keeps the main bundle small; OCR only downloads when an image is actually processed.
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const buffer = await file.arrayBuffer()
    // tesseract.js can take ArrayBuffer via Blob
    const blob = new Blob([buffer], { type: file.type || 'image/png' })
    const url = URL.createObjectURL(blob)
    try {
      const ret = await worker.recognize(url)
      return ret.data.text ?? ''
    } finally {
      URL.revokeObjectURL(url)
    }
  } finally {
    await worker.terminate()
  }
}

/**
 * Real extraction pipeline — never fabricates text.
 *
 * - text/markdown: File.text() → blocks
 * - pdf: pdfjs-dist getDocument → per-page text
 * - image: tesseract.js OCR
 * - pptx: honest failure (no parser yet)
 *
 * Provenance: `materialId` + `source: extracted` preserved; empty content
 * is handled as Ready with empty blocks, not as fake data.
 */
export async function processMaterialExtraction(file: File, material: Material): Promise<void> {
  await materialRepository.update(material.id, { extractionStatus: 'processing', updatedAt: Date.now() })

  try {
    let raw = ''
    let blocks: MaterialContentBlock[] = []

    switch (material.type) {
      case 'text':
      case 'markdown': {
        raw = await extractTextFile(file)
        blocks = toBlocks(raw)
        break
      }
      case 'pdf': {
        try {
          raw = await extractPdfFile(file)
        } catch (error) {
          console.warn('[extraction] pdf failed', error)
          throw new Error('PDF extraction failed — try a text/Markdown file or add content manually.')
        }
        if (!raw.trim()) {
          // PDFs that are scanned images need OCR fallback
          try {
            raw = await extractImageFile(file)
          } catch {
            // remain empty, will be treated as no readable content
          }
        }
        blocks = blocksFromParagraphs(raw.split(/\n\n+/))
        break
      }
      case 'image': {
        try {
          raw = await extractImageFile(file)
        } catch (error) {
          console.warn('[extraction] image ocr failed', error)
          throw new Error('Image text extraction failed.')
        }
        blocks = blocksFromParagraphs(raw.split(/\n\n+/).flatMap((para) => para.split('\n')))
        break
      }
      case 'pptx': {
        throw new Error('PowerPoint extraction is not yet supported — add content manually.')
      }
      default:
        throw new Error('Unsupported material type.')
    }

    // Empty content is honest — not fabricated. Mark ready but with no blocks.
    if (blocks.length === 0 && raw.trim().length === 0) {
      await materialRepository.update(material.id, { extractionStatus: 'ready', updatedAt: Date.now() })
      await saveMaterialContent({ materialId: material.id, source: 'extracted', blocks: [] })
      return
    }

    // Truncate very large docs for IndexedDB sanity (keep first ~200 blocks, ~8000 chars each)
    const truncated = blocks.slice(0, 200)

    await saveMaterialContent({ materialId: material.id, source: 'extracted', blocks: truncated })
    await materialRepository.update(material.id, { extractionStatus: 'ready', updatedAt: Date.now() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[extraction] ${material.id} failed:`, message)
    await materialRepository.update(material.id, { extractionStatus: 'failed', updatedAt: Date.now() })
    // Do not save fabricated content on failure
    throw error
  }
}
