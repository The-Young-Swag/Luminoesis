import type { ReactNode } from 'react'

import type { Material } from '#/features/learning-space/domain/learningSpace'
import { useMaterialFile } from '#/features/learning-space/hooks/useMaterialFile'
import { DocxPreview } from './DocxPreview'
import { ImagePreview } from './ImagePreview'
import { PdfPreview } from './PdfPreview'
import { PptxPreview } from './PptxPreview'

type MaterialPreviewProps = {
  material: Material
  /**
   * Rendered when the original file isn't available — either because it was
   * uploaded before file persistence existed, or persistence failed. We
   * fall back to the extracted-text reading experience instead of showing
   * nothing or fabricating a preview.
   */
  fallback: ReactNode
}

/**
 * Renders a faithful visual preview of the original uploaded file.
 *
 * Deliberately separate from MaterialContent: MaterialContent is the
 * normalized text the Tutor/Concepts/Flashcards/Quiz operate on, while this
 * shows the document the way the learner actually uploaded it.
 */
export function MaterialPreview({ material, fallback }: MaterialPreviewProps) {
  const { objectUrl, ready } = useMaterialFile(material.id)

  if (!ready) {
    return <p className="mono-label text-(--ink-faint)">Loading document…</p>
  }

  if (!objectUrl) {
    return <>{fallback}</>
  }

  switch (material.type) {
    case 'pdf':
      return <PdfPreview fileUrl={objectUrl} />
    case 'docx':
      return <DocxPreview fileUrl={objectUrl} />
    case 'pptx':
      return <PptxPreview fileUrl={objectUrl} />
    case 'image':
      return <ImagePreview fileUrl={objectUrl} fileName={material.source.fileName} />
    default:
      return <>{fallback}</>
  }
}