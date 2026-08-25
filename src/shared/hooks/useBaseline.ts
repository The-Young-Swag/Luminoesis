import { useEffect, useState } from 'react'

import {
  createEmptyBaseline,
  hasBaseline,
} from '#/features/learning-state/domain/baseline'
import type { BaselineMap } from '#/features/learning-state/domain/baseline'

import { baselineRepository } from '#/features/learning-state/repositories/baselineRepository'

export function useBaseline() {
  const [baseline, setBaseline] = useState<BaselineMap>(
    createEmptyBaseline(),
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true

    async function loadBaseline() {
      const features = await baselineRepository.findAll()

      if (!alive) {
        return
      }

      const map = Object.fromEntries(
        features.map((feature) => [
          feature.name,
          feature,
        ]),
      ) as BaselineMap

      setBaseline(map)
      setReady(true)
    }

    void loadBaseline()

    const interval = window.setInterval(() => {
      void loadBaseline()
    }, 5000)

    return () => {
      alive = false
      window.clearInterval(interval)
    }
  }, [])

  return {
    baseline,
    ready,
    hasBaseline: hasBaseline(baseline),
  }
}