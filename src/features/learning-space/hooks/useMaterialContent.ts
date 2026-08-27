import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { MaterialContent } from '#/features/learning-space/domain/materialContent'
import { materialContentRepository } from '#/features/learning-space/repositories/materialContentRepository'

export function useMaterialContent(materialId: string | undefined) {
  const [content, setContent] = useState<MaterialContent | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!materialId) {
      setContent(undefined)
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    const subscription = liveQuery(() =>
      materialContentRepository.findByMaterialId(materialId),
    ).subscribe({
      next: (next) => {
        if (cancelled) {
          return
        }

        setContent(next)
        setReady(true)
      },
      error: (error) => {
        if (cancelled) {
          return
        }

        console.error('Failed to load material content:', error)
        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [materialId])

  return { content, ready }
}
