import { useEffect, useState } from 'react'

import {
  getLastInferenceTiming,
  isTimingReadoutVisible,
  subscribeInferenceTiming,
  type InferenceTiming,
} from '#/features/tutor/domain/inferenceTiming'
import { describeWasmRuntime } from '#/features/tutor/providers/localTutorProvider'

function formatMs(value: number | null): string {
  if (value === null) return '—'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
  return `${value}ms`
}

/*
 * Dev-only inference readout: one line per answer with the same numbers
 * as the console.table row, plus WASM runtime state (isolation + threads).
 * Visible in DEV builds or with ?debug=tutor. Never ships to users.
 */
export function TutorTimingReadout() {
  const [timing, setTiming] = useState<InferenceTiming | null>(() =>
    getLastInferenceTiming(),
  )
  const [visible] = useState(() => isTimingReadoutVisible())
  const [runtime] = useState(() => {
    try {
      return describeWasmRuntime()
    } catch {
      return { isolated: false, threads: 1 }
    }
  })

  useEffect(() => {
    if (!visible) return
    return subscribeInferenceTiming(setTiming)
  }, [visible])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="mb-3 rounded-xl border border-dashed border-(--line-strong) px-3 py-2 font-mono text-[10px] leading-5 tabular-nums text-(--ink-soft)"
    >
      <span>
        tutor-perf · coi:{runtime.isolated ? 'yes' : 'no'} · threads:{runtime.threads}
      </span>
      {timing ? (
        <span className="block">
          {timing.path}/{timing.device}/{timing.tier} · load {formatMs(timing.loadMs)}
          {' '}(dl {formatMs(timing.downloadMs)} + sess {formatMs(timing.sessionMs)}) ·
          tok {formatMs(timing.tokenizeMs)} {timing.promptTokens ?? '—'}t ·
          prefill {formatMs(timing.prefillMs)} · decode {formatMs(timing.decodeMs)}{' '}
          {timing.outputTokens ?? '—'}t {timing.tokensPerSec ?? '—'}t/s ·
          total {formatMs(timing.totalMs)}
        </span>
      ) : (
        <span className="block">no answer measured yet</span>
      )}
    </div>
  )
}
