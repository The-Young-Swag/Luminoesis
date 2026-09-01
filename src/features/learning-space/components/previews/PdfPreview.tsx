import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

import { loadPdfjs } from '#/features/learning-space/application/pdfWorker'


type PdfjsModule = Awaited<ReturnType<typeof loadPdfjs>>

const MAX_RENDERED_PAGES = 50 // mirrors the extraction page cap
const PAGE_RENDER_SCALE = 1.4

type PdfPreviewProps = {
  fileUrl: string
}

export function PdfPreview({ fileUrl }: PdfPreviewProps) {
  const [pdfjsModule, setPdfjsModule] = useState<PdfjsModule | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPdf(null)
    setError(null)

    async function loadDocument() {
      try {
        const pdfjs = await loadPdfjs()
        const loadingTask = pdfjs.getDocument({ url: fileUrl })
        const document = await loadingTask.promise

        if (cancelled) {
          return
        }

        setPdfjsModule(pdfjs)
        setPdf(document)
      } catch (loadError) {
        console.warn('[preview] pdf render failed', loadError)
        if (!cancelled) {
          setError('This PDF could not be rendered for preview.')
        }
      }
    }

    void loadDocument()

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!pdf || !pdfjsModule) {
    return <p className="mono-label text-(--ink-faint)">Rendering PDF…</p>
  }

  const pageCount = Math.min(pdf.numPages, MAX_RENDERED_PAGES)
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1)

  return (
    <div>
      {pageNumbers.map((pageNumber) => (
        <PdfPage key={pageNumber} pdf={pdf} pdfjsModule={pdfjsModule} pageNumber={pageNumber} />
      ))}

      {pdf.numPages > MAX_RENDERED_PAGES && (
        <p className="mono-label text-(--ink-faint)">
          Showing the first {MAX_RENDERED_PAGES} of {pdf.numPages} pages.
        </p>
      )}
    </div>
  )
}

type PdfPageProps = {
  pdf: PDFDocumentProxy
  pdfjsModule: PdfjsModule
  pageNumber: number
}

function PdfPage({ pdf, pdfjsModule, pageNumber }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>()

  useEffect(() => {
    let cancelled = false

    async function renderPage() {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: PAGE_RENDER_SCALE })

      const canvas = canvasRef.current
      const textLayerContainer = textLayerRef.current
      if (!canvas || !textLayerContainer || cancelled) {
        return
      }

      canvas.width = viewport.width
      canvas.height = viewport.height
      setPageSize({ width: viewport.width, height: viewport.height })

      const canvasContext = canvas.getContext('2d')!

      await page.render({ canvasContext, viewport })

      // Selectable text layer, positioned to match the canvas exactly. This
      // is what lets the Selection Bubble work on real PDF text — the
      // Reader boundary just needs to contain this div, which it does.
      textLayerContainer.replaceChildren()
      textLayerContainer.style.setProperty('--scale-factor', String(viewport.scale))

      const textContent = await page.getTextContent()
      const textLayer = new pdfjsModule.TextLayer({
        textContentSource: textContent,
        container: textLayerContainer,
        viewport,
      })
      await textLayer.render()
    }

    void renderPage()

    return () => {
      cancelled = true
    }
  }, [pdf, pdfjsModule, pageNumber])

  return (
    <div
      className="relative mx-auto mb-6 shadow-sm"
      style={pageSize ? { width: pageSize.width, height: pageSize.height } : undefined}
    >
      <canvas ref={canvasRef} className="block" />
      <div ref={textLayerRef} className="textLayer" />
    </div>
  )
}