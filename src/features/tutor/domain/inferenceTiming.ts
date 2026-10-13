/*
 * Inference timing marks for the on-device tutor. One row per answer:
 * pipeline load, tokenization (+ prompt token count), prefill (time to
 * first token), decode (tokens/s). Recorded by both inference paths
 * (worker + main thread) and surfaced two ways:
 *   - console.table, one line per answer (all environments)
 *   - TutorTimingReadout in the panel (DEV or ?debug=tutor only)
 */

export type InferenceTiming = {
  tier: string
  device: string
  path: 'worker' | 'main'
  loadMs: number | null
  downloadMs: number | null
  sessionMs: number | null
  tokenizeMs: number | null
  promptTokens: number | null
  prefillMs: number | null
  decodeMs: number | null
  outputTokens: number | null
  tokensPerSec: number | null
  totalMs: number
}

type Listener = (timing: InferenceTiming) => void

const listeners = new Set<Listener>()
let lastTiming: InferenceTiming | null = null

export function recordInferenceTiming(timing: InferenceTiming): void {
  lastTiming = timing
  for (const listener of listeners) listener(timing)

  try {
    console.table([
      {
        path: timing.path,
        tier: timing.tier,
        device: timing.device,
        load_ms: timing.loadMs,
        download_ms: timing.downloadMs,
        session_ms: timing.sessionMs,
        tokenize_ms: timing.tokenizeMs,
        prompt_tokens: timing.promptTokens,
        prefill_ms: timing.prefillMs,
        decode_ms: timing.decodeMs,
        out_tokens: timing.outputTokens,
        tok_per_s: timing.tokensPerSec,
        total_ms: timing.totalMs,
      },
    ])
  } catch {
    // Logging must never break inference.
  }
}

export function getLastInferenceTiming(): InferenceTiming | null {
  return lastTiming
}

export function subscribeInferenceTiming(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isTimingReadoutVisible(): boolean {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return true
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('debug') === 'tutor'
    }
  } catch {
    // Non-browser runtimes (eval): no readout.
  }
  return false
}
