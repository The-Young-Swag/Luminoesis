import { useEffect, useState } from 'react'

import { extractPptxSlideTexts } from '#/features/learning-space/application/materialExtraction'
import type { PptxSlideText } from '#/features/learning-space/application/materialExtraction'

type PptxPreviewProps = {
  fileUrl: string
}

/**
 * PPTX does not have a mature, audited browser-side renderer that reproduces
 * PowerPoint's full visual layout. We therefore present each slide's actual
 * extracted text without pretending it is a visual slide rendering.
 */
export function PptxPreview({ fileUrl }: PptxPreviewProps) {
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
      <p className="mono-label text-(--ink-faint)">
        Reading slides…
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="mono-label text-(--ink-faint)">
        Slide-by-slide text preview — visual slide rendering isn&apos;t
        available client-side.
      </p>

      {slides.map((slide) => (
        <div
          key={slide.slideNumber}
          className="rounded-2xl border border-(--line) bg-(--surface) p-6"
        >
          <p className="mono-label mb-3 text-(--ink-faint)">
            Slide {slide.slideNumber}
          </p>

          <p className="whitespace-pre-line text-[15px] leading-relaxed text-(--ink-soft)">
            {slide.text || '(No text on this slide)'}
          </p>
        </div>
      ))}
    </div>
  )
}