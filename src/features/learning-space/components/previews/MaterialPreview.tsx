import type { ReactNode, RefObject } from 'react'

import type { Material } from '#/features/learning-space/domain/learningSpace'
import { useMaterialFile } from '#/features/learning-space/hooks/useMaterialFile'
import { DocxPreview } from './DocxPreview'
import { ImagePreview } from './ImagePreview'
import { PdfPreview } from './PdfPreview'
import { PptxPreview } from './PptxPreview'

type MaterialPreviewProps = {
  material: Material
  /**
   * The selection boundary must cover only the actual document content.
   * Preview controls intentionally live outside this element so their labels
   * cannot trigger the Selection Bubble.
   */
  contentRef?: RefObject<HTMLDivElement | null>
  fallback: ReactNode
}

export function MaterialPreview({
  material,
  contentRef,
  fallback,
}: MaterialPreviewProps) {
  const { objectUrl, ready } = useMaterialFile(material.id)

  if (!ready) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-(--line) bg-(--surface-muted)">
        <p className="mono-label text-(--ink-faint)">Loading document…</p>
      </div>
    )
  }

  if (!objectUrl) {
    return (
      <div ref={contentRef} className="w-full">
        {fallback}
      </div>
    )
  }

  switch (material.type) {
    case 'pdf':
      return <PdfPreview fileUrl={objectUrl} contentRef={contentRef} />
    case 'docx':
      return <DocxPreview fileUrl={objectUrl} contentRef={contentRef} />
    case 'pptx':
      return <PptxPreview fileUrl={objectUrl} contentRef={contentRef} />
    case 'image':
      return (
        <ImagePreview
          fileUrl={objectUrl}
          fileName={material.source.fileName}
          contentRef={contentRef}
        />
      )
    default:
      return (
        <div ref={contentRef} className="w-full">
          {fallback}
        </div>
      )
  }
}
