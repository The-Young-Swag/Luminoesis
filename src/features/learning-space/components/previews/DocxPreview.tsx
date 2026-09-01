import { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'

type DocxPreviewProps = {
  fileUrl: string
}

/**
 * Mammoth converts DOCX structure (headings, paragraphs, lists, tables,
 * links, inline images) into semantic HTML. It does not reproduce Word's
 * exact page layout, and unsupported features (text boxes, complex
 * positioning, headers/footers) are dropped — this is a high-quality
 * readable preview, not a pixel-exact Word clone.
 *
 * Styling uses Tailwind's typography plugin (already loaded in globals.css
 * via `@plugin '@tailwindcss/typography'`), with per-element color
 * overrides so it matches this app's design tokens instead of the plugin's
 * default palette. No component-scoped CSS file needed.
 */
export function DocxPreview({ fileUrl }: DocxPreviewProps) {
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
        const arrayBuffer = await response.arrayBuffer()

        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            // Inline images as data URIs so the preview works entirely from
            // the locally persisted Blob, with no network fetch of assets.
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
    return <p className="mono-label text-(--ink-faint)">Rendering document…</p>
  }

  return (
    <div
      className="prose prose-neutral max-w-none font-display text-[15.5px] leading-[1.8]
        prose-headings:font-display prose-headings:font-semibold prose-headings:text-(--ink)
        prose-p:text-(--ink-soft) prose-strong:text-(--ink) prose-em:text-(--ink-soft)
        prose-a:text-(--blue) prose-a:no-underline hover:prose-a:underline
        prose-li:text-(--ink-soft) prose-blockquote:border-(--line) prose-blockquote:text-(--ink-faint)
        prose-hr:border-(--line) prose-img:rounded-2xl prose-img:border prose-img:border-(--line)
        prose-table:text-[14px] prose-thead:border-(--line) prose-th:border-(--line) prose-td:border-(--line)"
      // Sanitized by DOMPurify above. Mammoth's own output is limited to a
      // fixed set of semantic tags, but the source document is untrusted
      // input, so we sanitize regardless.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}