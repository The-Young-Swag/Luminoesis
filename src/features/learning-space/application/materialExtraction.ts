import type { Material } from '#/features/learning-space/domain/learningSpace'
import type { MaterialDocumentInfo } from '#/features/learning-space/domain/learningSpace'
import type { MaterialContentBlock } from '#/features/learning-space/domain/materialContent'
import { materialRepository } from '#/features/learning-space/repositories/materialRepository'
import { loadPdfjs } from './pdfWorker'
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

/*
 * Same parse as the old extractPdfFile, plus the document facts pdfjs gives us
 * for free: metadata (Title/Author) and the true page count. Metadata is
 * read here — and only here — because this is the one place that holds
 * the open document; reopening the file elsewhere just for facts would
 * parse the whole PDF twice.
 */
async function extractPdfDocument(file: File): Promise<{
  text: string
  title?: string
  author?: string
  pageCount?: number
  firstPageText?: string
}> {
  // Apache 2.0, portfolio-safe. If pdfjs is not installed or fails, we throw
  // and the caller marks extraction failed honestly.
  const pdfjs = await loadPdfjs()

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

  const facts: {
    title?: string
    author?: string
    pageCount?: number
    firstPageText?: string
  } = {}
  const pageCount = typeof pdf.numPages === 'number' ? pdf.numPages : undefined
  if (pageCount !== undefined) facts.pageCount = pageCount
  const firstPage = texts[0]?.trim()
  if (firstPage) facts.firstPageText = firstPage
  try {
    const meta = (await pdf.getMetadata()) as unknown as {
      info?: Record<string, unknown>
    }
    const title = cleanMetadataText(meta.info?.Title)
    const author = cleanMetadataText(meta.info?.Author)
    if (title) facts.title = title
    if (author) facts.author = author
  } catch {
    // Metadata is a nicety — text extraction already succeeded.
  }

  return { text: texts.join('\n\n'), ...facts }
}

function cleanMetadataText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

async function extractDocxFile(file: File): Promise<string> {
  // mammoth.extractRawText produces plain text for the Tutor/extraction
  // pipeline. DocxPreview separately uses mammoth.convertToHtml for the
  // faithful visual preview — same library, two different conversions,
  // because the Tutor needs normalized text, not markup.
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
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
      return ret.data.text
    } finally {
      URL.revokeObjectURL(url)
    }
  } finally {
    await worker.terminate()
  }
}

const PPTX_MAX_SLIDES = 200 // guard against pathologically large decks, mirrors the PDF page cap
const PPTX_SLIDE_PATH_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/
const PPTX_TEXT_RUN_TAG = 'a:t'

function extractSlideNumber(slidePath: string): number {
  const match = slidePath.match(PPTX_SLIDE_PATH_PATTERN)
  return match ? Number(match[1]) : 0
}

function extractTextFromSlideXml(slideXml: string): string {
  const slideDocument = new DOMParser().parseFromString(slideXml, 'application/xml')
  const textRuns = Array.from(slideDocument.getElementsByTagName(PPTX_TEXT_RUN_TAG))

  return textRuns
    .map((run) => run.textContent)
    .filter((text) => text.trim().length > 0)
    .join(' ')
}

export type PptxSlideText = {
  slideNumber: number
  text: string
}

/**
 * Parses slide text out of a .pptx archive. Exported so PptxPreview can
 * reuse the exact same parsing for its slide-by-slide preview instead of
 * duplicating the JSZip/DOMParser logic.
 */
export async function extractPptxSlideTexts(file: File): Promise<PptxSlideText[]> {
  // Lazy-load JSZip — MIT, client-side only. A .pptx file is a zip archive;
  // each slide's text lives in ppt/slides/slideN.xml as <a:t> text runs.
  const JSZip = (await import('jszip')).default
  const archive = await JSZip.loadAsync(file)

  const slidePaths = Object.keys(archive.files)
    .filter((path) => PPTX_SLIDE_PATH_PATTERN.test(path))
    .sort((a, b) => extractSlideNumber(a) - extractSlideNumber(b))
    .slice(0, PPTX_MAX_SLIDES)

  const slides: PptxSlideText[] = []

  for (let index = 0; index < slidePaths.length; index++) {
    const slideXml = await archive.files[slidePaths[index]].async('text')
    slides.push({ slideNumber: index + 1, text: extractTextFromSlideXml(slideXml) })
  }

  return slides
}

async function extractPptxFile(file: File): Promise<string> {
  const slides = await extractPptxSlideTexts(file)

  // One heading per slide keeps slide boundaries visible in MaterialContent,
  // and reuses blocksFromParagraphs the same way PDF pages already do.
  return slides
    .filter((slide) => slide.text.length > 0)
    .map((slide) => `# Slide ${slide.slideNumber}\n${slide.text}`)
    .join('\n\n')
}

/**
 * Real extraction pipeline — never fabricates text.
 *
 * - text/markdown: File.text() → blocks
 * - pdf: pdfjs-dist getDocument → per-page text layer, Tesseract OCR fallback for scanned pages
 * - docx: mammoth.extractRawText → blocks
 * - image: tesseract.js OCR
 * - pptx: JSZip → per-slide <a:t> text runs, one heading block per slide
 *
 * This produces MaterialContent for the Tutor/Concepts/Flashcards/Quiz —
 * it is deliberately separate from the visual document preview, which reads
 * the persisted original file instead (see materialFileRepository).
 *
 * Provenance: `materialId` + `source: extracted` preserved; empty content
 * is handled as Ready with empty blocks, not as fake data.
 */
export async function processMaterialExtraction(file: File, material: Material): Promise<void> {
  await materialRepository.update(material.id, { extractionStatus: 'processing', updatedAt: Date.now() })

  try {
    let raw = ''
    let blocks: MaterialContentBlock[] = []
    let documentInfo: MaterialDocumentInfo | undefined

    switch (material.type) {
      case 'text':
      case 'markdown': {
        raw = await extractTextFile(file)
        blocks = toBlocks(raw)
        break
      }
      case 'pdf': {
        try {
          const doc = await extractPdfDocument(file)
          raw = doc.text
          const info: MaterialDocumentInfo = {}
          if (doc.title) info.title = doc.title
          if (doc.author) info.author = doc.author
          if (doc.pageCount !== undefined) info.pageCount = doc.pageCount
          if (doc.firstPageText) info.firstPageText = doc.firstPageText
          if (Object.keys(info).length > 0) documentInfo = info
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
      case 'docx': {
        try {
          raw = await extractDocxFile(file)
        } catch (error) {
          console.warn('[extraction] docx failed', error)
          throw new Error('Word document extraction failed — try adding content manually.')
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
        try {
          raw = await extractPptxFile(file)
        } catch (error) {
          console.warn('[extraction] pptx failed', error)
          throw new Error('PowerPoint extraction failed — try adding content manually.')
        }
        blocks = blocksFromParagraphs(raw.split(/\n\n+/))
        break
      }
      default:
        throw new Error('Unsupported material type.')
    }

    // Empty content is honest — not fabricated. Mark ready but with no blocks.
    // Document facts (e.g. PDF metadata) are still worth keeping.
    if (blocks.length === 0 && raw.trim().length === 0) {
      await materialRepository.update(material.id, {
        extractionStatus: 'ready',
        updatedAt: Date.now(),
        ...(documentInfo ? { documentInfo } : {}),
      })
      await saveMaterialContent({ materialId: material.id, source: 'extracted', blocks: [] })
      return
    }

    // Truncate very large docs for IndexedDB sanity (keep first ~200 blocks, ~8000 chars each)
    const truncated = blocks.slice(0, 200)

    // Non-PDF types have no metadata; their first block doubles as the
    // first-page text so document-info answers still have a source.
    if (!documentInfo) {
      const firstBlock = truncated[0]?.text.trim()
      if (firstBlock) documentInfo = { firstPageText: firstBlock }
    }

    await saveMaterialContent({ materialId: material.id, source: 'extracted', blocks: truncated })
    await materialRepository.update(material.id, {
      extractionStatus: 'ready',
      updatedAt: Date.now(),
      ...(documentInfo ? { documentInfo } : {}),
    })

    // Warm the tutor's retrieval index in the background so the first
    // question never pays tokenization.
    const { precomputeChunkIndex } = await import('#/features/tutor/domain/materialRetrieval')
    precomputeChunkIndex(material.id, truncated)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[extraction] ${material.id} failed:`, message)
    await materialRepository.update(material.id, { extractionStatus: 'failed', updatedAt: Date.now() })
    // Do not save fabricated content on failure
    throw error
  }
}