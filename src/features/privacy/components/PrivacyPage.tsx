import { useEffect, useState } from 'react'

import type {
  BaselineFeature,
  FeatureName,
  SessionSignal,
} from '#/features/learning-state/domain/learningSignals'

import {
  deleteAllData,
  exportAllData,
  exportCards,
  loadPrivacyData,
  setAdaptiveOptIn,
} from '#/features/privacy/privacyService'
import { downloadJson } from '#/shared/lib/download'

const FEATURE_LABEL: Record<FeatureName, string> = {
  interKeyLatency: 'Time between keystrokes',
  dwellTime: 'Key hold time',
  correctionRate: 'Backspace rate',
  wpm: 'Typing speed',
}

/**
 * Translate a baseline feature's mean/standard-deviation/sample-count
 * into plain language. The numbers are preserved in the muted
 * "reference" line so the underlying statistics stay available.
 */
function describeBaseline(feature: BaselineFeature): {
  summary: string
  reference: string
} {
  const low = Math.max(0, feature.mean - feature.stddev)
  const high = feature.mean + feature.stddev

  if (feature.name === 'correctionRate') {
    const pct = (value: number) => `${(value * 100).toFixed(1)}%`

    return {
      summary: `Usually around ${pct(feature.mean)} of keystrokes are corrections, most often between ${pct(low)} and ${pct(high)}.`,
      reference: `Typical ${pct(feature.mean)} · spread ${pct(feature.stddev)} · ${feature.sampleCount} samples`,
    }
  }

  if (feature.name === 'wpm') {
    return {
      summary: `Usually about ${Math.round(feature.mean)} words per minute, typically ranging ${Math.round(low)}–${Math.round(high)}.`,
      reference: `Typical ${feature.mean.toFixed(1)} wpm · spread ${feature.stddev.toFixed(1)} · ${feature.sampleCount} samples`,
    }
  }

  return {
    summary: `Usually about ${Math.round(feature.mean)} ms, typically ranging ${Math.round(low)}–${Math.round(high)} ms.`,
    reference: `Typical ${feature.mean.toFixed(1)} ms · spread ${feature.stddev.toFixed(1)} ms · ${feature.sampleCount} samples`,
  }
}

export function PrivacyPage() {
  const [optIn, setOptIn] = useState<boolean | null>(null)
  const [signals, setSignals] = useState<SessionSignal[]>([])
  const [baseline, setBaseline] = useState<BaselineFeature[]>([])

  const refresh = async () => {
    const data = await loadPrivacyData()

    setOptIn(data.optIn)
    setSignals(data.signals)
    setBaseline(data.baseline)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const handleOptIn = async () => {
    await setAdaptiveOptIn(true)
    setOptIn(true)
  }

  const handleOptOut = async () => {
    await setAdaptiveOptIn(false)
    setOptIn(false)
  }

  const handleExport = async () => {
    const data = await exportAllData()
    downloadJson('Luminoesis-export.json', data)
  }

  const handleExportCards = async () => {
    const cards = await exportCards()

    const data = cards.map((card) => ({
      front: card.front,
      back: card.back,
      topic: card.topic,
    }))

    downloadJson('Luminoesis-cards.json', data)
  }

  const handleDelete = async () => {
    if (!confirm('Delete all on-device data? This cannot be undone.')) {
      return
    }

    await deleteAllData()
    location.reload()
  }

  return (
    <div className="page-wrap max-w-220 py-8">
      <p className="kicker">Transparency &amp; privacy</p>

      <h1 className="display text-[28px]">Your data trains only you</h1>

      <p className="mt-1 text-sm text-(--ink-soft)">
        Luminoesis does not record the words you type. It only measures{' '}
        <em>timing</em> — how you type, not what you write. That protection is
        built in: the instant a key is pressed, only a number (the timing) is
        kept, and the actual character is thrown away before anything is ever
        stored. Nothing is sent to a server.
      </p>

      <div className="card-flat mt-6 p-5">
        <h2 className="text-sm font-semibold">What gets measured</h2>

        <ul className="mt-3 grid gap-2 text-sm">
          <li className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--blue)" />
            <span>
              <strong>Time between keystrokes</strong> — the pause from one key
              to the next, in milliseconds.
            </span>
          </li>

          <li className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--purple)" />
            <span>
              <strong>Key hold time</strong> — how long you keep each key
              pressed down.
            </span>
          </li>

          <li className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--amber)" />
            <span>
              <strong>Backspace rate</strong> — how often you press Backspace to
              fix a mistake.
            </span>
          </li>

          <li className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--veridian)" />
            <span>
              <strong>Typing speed</strong> — how fast you type, in words per
              minute.
            </span>
          </li>
        </ul>

        <p className="mt-3 text-xs text-(--ink-faint)">
          Only these summarized numbers are ever kept. The actual characters you
          type are never saved, sent, or used to build any of these measures.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm font-medium">Adaptive mode</span>

          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${
              optIn
                ? 'border-(--emerald)/30 bg-(--emerald-muted) text-(--veridian-strong)'
                : optIn === false
                  ? 'border-(--line) bg-(--surface-muted) text-(--ink-faint)'
                  : 'border-(--warning)/30 bg-(--warning-muted) text-(--warning-strong)'
            }`}
          >
            {optIn === true
              ? 'Opted in'
              : optIn === false
                ? 'Off'
                : 'Not asked'}
          </span>

          <div className="ml-auto flex gap-2">
            <button
              className="btn-ghost text-xs"
              onClick={() => void handleOptIn()}
            >
              Opt in
            </button>

            <button
              className="btn-ghost text-xs"
              onClick={() => void handleOptOut()}
            >
              Opt out
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-(--ink-faint)">
          If you opt out, or on non-keyboard input, Luminoesis still works
          fully — it simply falls back to a standard study scheduler with no
          personalization.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card-flat p-5">
          <h3 className="text-sm font-semibold">Your personal baseline</h3>

          <p className="mt-1 text-xs text-(--ink-faint)">
            A reference built from your own typing, so Luminoesis can notice
            when your rhythm changes. “Typical” is your normal value; “spread”
            is how much it usually varies.
          </p>

          <div className="mt-3 space-y-1 text-sm">
            {baseline.length === 0 && (
              <p className="text-(--ink-soft)">
                No baseline yet — this fills in after a few typing sessions.
              </p>
            )}

            {baseline.map((item) => {
              const text = describeBaseline(item)

              return (
                <div
                  key={item.name}
                  className="border-b border-(--line) py-3 last:border-0"
                >
                  <p className="font-medium text-(--ink)">
                    {FEATURE_LABEL[item.name]}
                  </p>

                  <p className="mt-1 text-(--ink-soft)">{text.summary}</p>

                  <p className="mt-1 text-xs text-(--ink-faint)">
                    {text.reference}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card-flat p-5">
          <h3 className="text-sm font-semibold">Your typing, last 24 hours</h3>

          <p className="text-xs text-(--ink-faint)">
            A once-per-minute summary of how you typed — never the actual
            keystrokes.
          </p>

          <div className="mt-3 max-h-55 space-y-1.5 overflow-auto text-xs">
            {signals.length === 0 && (
              <p className="text-sm text-(--ink-soft)">
                No readings yet. Type in Review to generate some.
              </p>
            )}

            {signals.map((signal) => (
              <div
                key={signal.timestamp}
                className="flex flex-wrap gap-3 rounded-lg border border-(--line) bg-(--surface-muted) px-3 py-2"
              >
                <span className="text-(--ink-faint)">
                  {new Date(signal.timestamp).toLocaleTimeString()}
                </span>

                <span>Between keys {Math.round(signal.interKeyLatency)} ms</span>

                <span>
                  Backspaces {(signal.correctionRate * 100).toFixed(1)}%
                </span>

                <span>{Math.round(signal.wpm)} wpm</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-flat mt-4 p-5">
        <h3 className="text-sm font-semibold">Your data controls</h3>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => void handleExport()}>
            Export everything
          </button>

          <button
            className="btn-ghost"
            onClick={() => void handleExportCards()}
          >
            Export cards only
          </button>

          <button
            className="btn-ghost border-(--destructive)/30 text-destructive hover:bg-(--destructive)/10"
            onClick={() => void handleDelete()}
          >
            Delete all data
          </button>
        </div>

        <p className="mt-2 text-xs text-(--ink-faint)">
          One click exports everything in a single file, and one click deletes
          it all. No cloud account required.
        </p>
      </div>

      <div className="card-flat mt-4 p-5">
        <h3 className="text-sm font-semibold">AI Tutor &amp; your privacy</h3>

        <p className="mt-1 text-sm leading-relaxed text-(--ink-soft)">
          Luminoesis prefers on-device AI when available — it&apos;s private, offline,
          and nothing leaves your device. If local AI can&apos;t run on your device,
          you may use the online Tutor as a fallback. When you do, the selected
          learning context (your question, highlighted text, and a short excerpt
          from the material) is sent to the online provider to generate a
          response.
        </p>

        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-(--ink-soft)">
          <li>This demo allows up to 3 online material uploads per person. Local AI does not count toward this limit.</li>
          <li>After 3, you&apos;ll see &ldquo;You&apos;ve used all 3 online Tutor uploads&rdquo; — local AI and all non-AI features keep working.</li>
          <li>The app remains fully usable without online AI. Study, review, flashcards, quizzes and insights never require it.</li>
        </ul>

        <p className="mt-3 text-xs text-(--ink-faint)">
          The 3-upload limit is enforced on the server. Because this demo has no login, the limit uses an anonymous browser cookie — it&apos;s a demo safeguard, not strong authentication.
        </p>
      </div>

      <div className="card-flat mt-4 p-5">
        <h3 className="text-sm font-semibold">Works offline, costs nothing</h3>

        <p className="mt-1 text-sm text-(--ink-soft)">
          Core study works with no network at all — your data lives on your
          device, and the app caches itself so it runs in airplane mode. If you
          switch on the optional sync, it simply waits and catches up later; it
          never blocks studying. There is no paid service anywhere.
        </p>
      </div>
    </div>
  )
}
