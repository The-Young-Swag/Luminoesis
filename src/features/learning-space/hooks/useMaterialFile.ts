import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import { materialFileRepository } from '#/features/learning-space/repositories/materialFileRepository'

type MaterialFileState = {
  objectUrl: string | undefined
  ready: boolean
}

/**
 * Loads the original uploaded file for a material and exposes it as an
 * object URL, for <img>/<canvas>/pdfjs-based preview rendering.
 *
 * The object URL is recreated whenever the underlying Blob changes and
 * revoked on cleanup so we don't leak memory across materials or reloads.
 */
export function useMaterialFile(materialId: string): MaterialFileState {
  const [objectUrl, setObjectUrl] = useState<string | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let currentObjectUrl: string | undefined
    setReady(false)

    const subscription = liveQuery(() =>
      materialFileRepository.findByMaterialId(materialId),
    ).subscribe({
      next: (record) => {
        if (cancelled) {
          return
        }

        if (currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl)
        }

        currentObjectUrl = record ? URL.createObjectURL(record.blob) : undefined
        setObjectUrl(currentObjectUrl)
        setReady(true)
      },
      error: (error) => {
        if (cancelled) {
          return
        }

        console.error('Failed to load material file:', error)
        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
    }
  }, [materialId])

  return { objectUrl, ready }
}