import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

import type { Material } from '#/features/learning-space/domain/learningSpace'
import { materialRepository } from '#/features/learning-space/repositories/materialRepository'

export function useMaterial(materialId: string) {
  const [material, setMaterial] = useState<Material | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const subscription = liveQuery(() =>
      materialRepository.findById(materialId),
    ).subscribe({
      next: (next) => {
        if (cancelled) {
          return
        }

        setMaterial(next)
        setReady(true)
      },
      error: (error) => {
        if (cancelled) {
          return
        }

        console.error('Failed to load material:', error)
        setReady(true)
      },
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [materialId])

  return { material, ready }
}
