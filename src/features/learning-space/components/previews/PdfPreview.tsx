import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

import { loadPdfjs } from '#/features/learning-space/application/pdfWorker'
import { PreviewToolbar } from './PreviewToolbar'

type PdfjsModule = Awaited<ReturnType<typeof loadPdfjs>>

const MAX_RENDERED_PAGES = 50
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.1
const FIT_HORIZONTAL_PADDING = 24

type PdfPreviewProps = {
  fileUrl: string
  contentRef?: RefObject<HTMLDivElement | null>
}

export function PdfPreview({ fileUrl, contentRef }: PdfPreviewProps) {
  const [pdfjsModule, setPdfjsModule] = useState<PdfjsModule | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [maxPageWidth, setMaxPageWidth] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    setPdf(null)
    setPdfjsModule(null)
    setError(null)
    setMaxPageWidth(null)
    setZoom(1)
    setFitMode(true)

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

        const pageCount = Math.min(document.numPages, MAX_RENDERED_PAGES)
        const widths = await Promise.all(
          Array.from({ length: pageCount }, async (_, index) => {
            const page = await document.getPage(index + 1)
            return page.getViewport({ scale: 1 }).width
          }),
        )

        if (widths.length > 0) {
          setMaxPageWidth(Math.max(...widths))
        }

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

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setContainerWidth(width)
    })

    observer.observe(element)
    setContainerWidth(element.clientWidth)

    return () => observer.disconnect()
  }, [pdf])

  const fitZoom =
    maxPageWidth && containerWidth > 0
      ? Math.min(
          MAX_ZOOM,
          Math.max(
            MIN_ZOOM,
            (containerWidth - FIT_HORIZONTAL_PADDING) / maxPageWidth,
          ),
        )
      : 1

  useEffect(() => {
    if (fitMode && maxPageWidth && containerWidth > 0) {
      setZoom(fitZoom)
    }
  }, [fitMode, fitZoom, maxPageWidth, containerWidth])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!pdf || !pdfjsModule) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-(--line) bg-(--surface-muted)">
        <p className="mono-label text-(--ink-faint)">Rendering PDF…</p>
      </div>
    )
  }

  const pageCount = Math.min(pdf.numPages, MAX_RENDERED_PAGES)
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1)

  const changeZoom = (delta: number) => {
    setFitMode(false)
    setZoom((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))),
    )
  }

  const resetZoom = () => {
    setFitMode(false)
    setZoom(1)
  }

  const fitToWidth = () => {
    setFitMode(true)
    setZoom(fitZoom)
  }

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <PreviewToolbar
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onZoomOut={() => changeZoom(-ZOOM_STEP)}
        onZoomIn={() => changeZoom(ZOOM_STEP)}
        onReset={resetZoom}
        onFit={fitToWidth}
        fitLabel="Fit width"
        label={`PDF · ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}`}
      />

      <div
        ref={contentRef}
        className="flex min-w-0 flex-col items-center gap-6"
      >
        {pageNumbers.map((pageNumber) => (
          <PdfPage
            key={pageNumber}
            pdf={pdf}
            pdfjsModule={pdfjsModule}
            pageNumber={pageNumber}
            scale={zoom}
          />
        ))}

        {pdf.numPages > MAX_RENDERED_PAGES && (
          <p className="mono-label pb-4 text-center text-(--ink-faint)">
            Showing the first {MAX_RENDERED_PAGES} of {pdf.numPages} pages.
          </p>
        )}
      </div>
    </div>
  )
}

type PdfPageProps = {
  pdf: PDFDocumentProxy
  pdfjsModule: PdfjsModule
  pageNumber: number
  scale: number
}

function PdfPage({
  pdf,
  pdfjsModule,
  pageNumber,
  scale,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState<{
    width: number
    height: number
  }>()

  useEffect(() => {
    let cancelled = false
    let renderTask: ReturnType<PDFPageProxy['render']> | undefined

    async function renderPage() {
      const page = await pdf.getPage(pageNumber)

      if (cancelled) {
        return
      }

      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      const textLayerContainer = textLayerRef.current

      if (canvas === null || textLayerContainer === null) {
        return
      }

      const devicePixelRatio = window.devicePixelRatio || 1

      canvas.width = Math.ceil(viewport.width * devicePixelRatio)
      canvas.height = Math.ceil(viewport.height * devicePixelRatio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      setPageSize({
        width: viewport.width,
        height: viewport.height,
      })

      const canvasContext = canvas.getContext('2d')

      if (canvasContext === null) {
        return
      }

      renderTask = page.render({
        canvasContext,
        viewport,
        transform:
          devicePixelRatio !== 1
            ? [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0]
            : undefined,
      })

await renderTask.promise

textLayerContainer.replaceChildren()

      textLayerContainer.style.setProperty(
        '--scale-factor',
        String(viewport.scale),
      )

      const textContent = await page.getTextContent()

      const textLayer = new pdfjsModule.TextLayer({
        textContentSource: textContent,
        container: textLayerContainer,
        viewport,
      })

      await textLayer.render()
    }

    void renderPage().catch((renderError) => {
      if (!cancelled) {
        console.warn(
          `[preview] PDF page ${pageNumber} failed`,
          renderError,
        )
      }
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, pdfjsModule, pageNumber, scale])

  return (
    <div
      className="relative max-w-full overflow-visible rounded-sm bg-white shadow-[0_2px_12px_rgba(15,23,42,0.12)]"
      style={
        pageSize
          ? {
              width: pageSize.width,
              height: pageSize.height,
            }
          : undefined
      }
    >
      <canvas ref={canvasRef} className="block max-w-full" />

      <div
        ref={textLayerRef}
        className="textLayer"
        aria-label={`Page ${pageNumber} selectable text`}
      />
    </div>
  )
}
