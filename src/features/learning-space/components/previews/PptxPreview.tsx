import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

import { extractPptxSlideTexts } from '#/features/learning-space/application/materialExtraction'
import type { PptxSlideText } from '#/features/learning-space/application/materialExtraction'

type PptxPreviewProps = {
  fileUrl: string
  contentRef?: RefObject<HTMLDivElement | null>
}

/**
 * PPTX is presented as a structured slide preview. The browser does not
 * reproduce PowerPoint's full visual layout here, so the UI makes that
 * limitation explicit rather than presenting extracted text as a fake slide.
 */
export function PptxPreview({ fileUrl, contentRef }: PptxPreviewProps) {
  const [slides, setSlides] = useState<PptxSlideText[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setSlides(null)
    setError(null)

    async function loadSlides() {
      try {
        const response = await fetch(fileUrl)

        if (!response.ok) {
          throw new Error(`Failed to load presentation: ${response.status}`)
        }

        const blob = await response.blob()
        const file = new File([blob], 'presentation.pptx', {
          type: blob.type,
        })

        const slideTexts = await extractPptxSlideTexts(file)

        if (!cancelled) {
          setSlides(slideTexts)
        }
      } catch (loadError) {
        console.warn('[preview] pptx render failed', loadError)

        if (!cancelled) {
          setError('This presentation could not be read for preview.')
        }
      }
    }

    void loadSlides()

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!slides) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-(--line) bg-(--surface-muted)">
        <p className="mono-label text-(--ink-faint)">Reading slides…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-(--line) bg-(--surface-muted) px-4 py-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--surface) text-(--blue) shadow-sm">
          <span className="font-mono text-[10px] font-semibold">PPT</span>
        </span>
        <p className="text-xs leading-relaxed text-(--ink-soft)">
          Slide text is shown in reading order. PowerPoint&apos;s original visual
          layout, animations, and positioning are not reproduced in this
          client-side preview.
        </p>
      </div>

      <div ref={contentRef} className="space-y-5">
        {slides.map((slide) => (
          <section
            key={slide.slideNumber}
            className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface) shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-(--line) bg-(--surface-muted) px-4 py-2.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-(--ink-faint)">
                Slide {slide.slideNumber}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-(--ink-faint)">
                {slide.text ? 'Text' : 'Empty'}
              </span>
            </div>

            <div className="min-h-56 bg-(--surface) px-6 py-8 sm:px-10 sm:py-10">
              {slide.text ? (
                <p className="max-w-3xl whitespace-pre-line text-[15px] leading-[1.8] text-(--ink-soft)">
                  {slide.text}
                </p>
              ) : (
                <p className="text-sm italic text-(--ink-faint)">
                  No readable text on this slide.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
