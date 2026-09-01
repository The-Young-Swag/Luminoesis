import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import DOMPurify from 'dompurify'

type DocxPreviewProps = {
  fileUrl: string
  contentRef?: RefObject<HTMLDivElement | null>
}

/**
 * Mammoth converts DOCX structure into semantic HTML. It intentionally
 * prioritizes readable content over pixel-perfect Word pagination.
 */
export function DocxPreview({ fileUrl, contentRef }: DocxPreviewProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setHtml(null)
    setError(null)

    async function renderDocument() {
      try {
        const mammoth = await import('mammoth')
        const response = await fetch(fileUrl)

        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.status}`)
        }

        const arrayBuffer = await response.arrayBuffer()

        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            convertImage: mammoth.images.imgElement((image) =>
              image.read('base64').then((base64Data) => ({
                src: `data:${image.contentType};base64,${base64Data}`,
              })),
            ),
          },
        )

        if (!cancelled) {
          setHtml(DOMPurify.sanitize(result.value))
        }
      } catch (renderError) {
        console.warn('[preview] docx render failed', renderError)
        if (!cancelled) {
          setError('This document could not be rendered for preview.')
        }
      }
    }

    void renderDocument()

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!html) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-(--line) bg-(--surface-muted)">
        <p className="mono-label text-(--ink-faint)">Rendering document…</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-(--line) bg-(--surface-muted) p-2 shadow-sm sm:p-4">
      <div
        ref={contentRef}
        className="prose prose-neutral max-w-none bg-(--surface) px-6 py-8 font-display text-[15.5px] leading-[1.8] shadow-sm sm:px-12 sm:py-12
          prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-(--ink)
          prose-p:text-(--ink-soft) prose-strong:text-(--ink) prose-em:text-(--ink-soft)
          prose-a:text-(--blue) prose-a:no-underline hover:prose-a:underline
          prose-li:text-(--ink-soft) prose-blockquote:border-(--line) prose-blockquote:text-(--ink-faint)
          prose-hr:border-(--line) prose-img:rounded-xl prose-img:border prose-img:border-(--line)
          prose-table:text-[14px] prose-thead:border-(--line) prose-th:border-(--line) prose-td:border-(--line)"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
