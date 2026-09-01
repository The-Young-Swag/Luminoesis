export type RetrievalQueryInput = {
    question: string
    materialTitle: string
    conceptNames: string[]
  }
  
  export type WebSource = {
    title: string
    url: string
    extract: string
  }
  
  export type WebRetrievalResult = {
    sources: WebSource[]
  }
  
  export type WebRetrievalCacheEntry = {
    queryKey: string
    materialId?: string
    sources: WebSource[]
    retrievedAt: number
    expiresAt: number
  }