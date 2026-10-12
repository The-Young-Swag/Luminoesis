import { useEffect, useState } from 'react'

/**
 * Counts from 0 to `value` on mount. Renders 0 on the server so hydration
 * matches, then animates client-side. Jumps straight to `value` under
 * `prefers-reduced-motion`.
 */
export function AnimatedNumber({
  value,
  duration = 900,
}: {
  value: number
  duration?: number
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(value)
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <>{display}</>
}
