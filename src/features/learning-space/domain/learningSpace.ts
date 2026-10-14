export type LearningSpaceId = string
export type MaterialId = string
export type ConceptId = string
export type HighlightId = string

export type LearningSpace = {
  id: LearningSpaceId
  title: string
  description?: string
  createdAt: number
  updatedAt: number
}

export type MaterialType =
  | 'pdf'
  | 'image'
  | 'pptx'
  | 'docx'
  | 'text'
  | 'markdown'

export type MaterialSource = {
  kind: 'local-file'
  fileName: string
  mimeType: string
  sizeBytes: number
}

export type MaterialExtractionStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'failed'

export type Material = {
  id: MaterialId
  learningSpaceId: LearningSpaceId
  title: string
  type: MaterialType
  source: MaterialSource
  extractionStatus: MaterialExtractionStatus
  createdAt: number
  updatedAt: number
  /*
   * Facts about the document itself (cover identity, not content):
   * PDF metadata plus the first page's text. Stored at ingestion so
   * document-info questions ("who wrote this?") are answered from these
   * facts without retrieval or a model call. Optional and unindexed, so
   * no Dexie version bump was needed — old rows simply lack the field.
   */
  documentInfo?: MaterialDocumentInfo
}

export type MaterialDocumentInfo = {
  title?: string
  author?: string
  pageCount?: number
  firstPageText?: string
}

export type Concept = {
  id: ConceptId
  learningSpaceId: LearningSpaceId
  name: string
  description?: string
  materialIds: MaterialId[]
  createdAt: number
  updatedAt: number
}

export type Highlight = {
  id: HighlightId
  learningSpaceId: LearningSpaceId
  materialId: MaterialId
  conceptId?: ConceptId
  text: string
  note?: string
  locator: MaterialLocator
  createdAt: number
}

export type MaterialLocator =
  | {
      kind: 'pdf'
      page: number
      startOffset?: number
      endOffset?: number
    }
  | {
      kind: 'image'
      region?: {
        x: number
        y: number
        width: number
        height: number
      }
    }
  | {
      kind: 'slide'
      slide: number
      startOffset?: number
      endOffset?: number
    }
  | {
      kind: 'text'
      startOffset: number
      endOffset: number
    }
