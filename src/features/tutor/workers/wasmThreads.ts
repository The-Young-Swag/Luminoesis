/*
 * WASM thread resolution for onnxruntime-web, shared by the worker and the
 * main-thread fallback. Multi-threaded WASM needs SharedArrayBuffer, which
 * needs a cross-origin-isolated context (COOP + COEP headers). Without it,
 * onnxruntime-web warns and silently falls back to 1 thread — we set 1
 * up front instead and report it in the timing readout.
 *
 * `?tutorThreads=N` forces a thread count (measurement only).
 */

export function isCrossOriginIsolatedContext(): boolean {
  try {
    return typeof self !== 'undefined' && self.crossOriginIsolated === true
  } catch {
    return false
  }
}

export function hardwareThreadCount(): number {
  try {
    const count =
      typeof self !== 'undefined' && typeof self.navigator !== 'undefined'
        ? self.navigator.hardwareConcurrency
        : typeof navigator !== 'undefined'
          ? navigator.hardwareConcurrency
          : 4
    return typeof count === 'number' && count > 0 ? Math.floor(count) : 4
  } catch {
    return 4
  }
}

export function resolveWasmThreads(): number {
  try {
    const location =
      typeof self !== 'undefined' && self.location
        ? self.location
        : typeof window !== 'undefined'
          ? window.location
          : undefined
    const override = location
      ? new URLSearchParams(location.search).get('tutorThreads')
      : null
    if (override !== null) {
      const parsed = Number.parseInt(override, 10)
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 16) return parsed
    }
  } catch {
    // URL parsing must never break inference.
  }

  if (!isCrossOriginIsolatedContext()) return 1
  return Math.min(Math.max(1, hardwareThreadCount()), 8)
}
