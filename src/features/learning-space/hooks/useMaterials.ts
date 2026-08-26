import { useCallback, useEffect, useState } from 'react'

import type { Material } from '#/features/learning-space/domain/learningSpace'
import { materialRepository } from '#/features/learning-space/repositories/materialRepository'

export function useMaterials(learningSpaceId: string) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const nextMaterials =
      await materialRepository.findByLearningSpaceId(learningSpaceId)

    setMaterials(nextMaterials)
    setReady(true)
  }, [learningSpaceId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const nextMaterials =
        await materialRepository.findByLearningSpaceId(learningSpaceId)

      if (cancelled) {
        return
      }

      setMaterials(nextMaterials)
      setReady(true)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [learningSpaceId])

  return {
    materials,
    ready,
    refresh,
  }
}
