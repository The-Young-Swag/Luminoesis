import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Moon, Sun, ShieldCheck, Download, Trash2 } from 'lucide-react'

import { useTheme } from '#/shared/hooks/useTheme'
import { downloadJson } from '#/shared/lib/download'
import { PageHeader } from '#/shared/components/ui/PageHeader'
import { settingsRepository } from '#/shared/repositories/settingsRepository'
import { deleteAllData, exportAllData, loadPrivacyData, setAdaptiveOptIn } from '#/features/privacy/privacyService'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const [optIn, setOptIn] = useState<boolean | null>(null)
  const [modelTier, setModelTier] = useState<'standard' | 'capable'>('standard')
  const [escalation, setEscalation] = useState(false)

  useEffect(() => {
    loadPrivacyData().then((data) => setOptIn(data.optIn)).catch(() => {})
    settingsRepository.getLocalModelTier().then(setModelTier).catch(() => {})
    settingsRepository.getTutorEscalation().then(setEscalation).catch(() => {})
  }, [])

  const handleOptIn = async (value: boolean) => {
    await setAdaptiveOptIn(value)
    setOptIn(value)
  }

  const handleExport = async () => {
    const data = await exportAllData()
    downloadJson('Luminoesis-export.json', data)
  }

  const handleDelete = async () => {
    if (!confirm('Delete all on-device data? This cannot be undone.')) return
    await deleteAllData()
    location.reload()
  }

  const isDark = theme === 'dark'

  return (
    <div className="page-wrap max-w-220 space-y-4 py-6 md:py-8">
      <PageHeader
        title="Settings"
        context="On this device · no account needed"
      />

      <div className="card-flat p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {isDark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />} Appearance
        </h2>
        <p className="mt-1 text-xs text-(--ink-soft)">Switch between light and dark. Choice persists on this device.</p>
        <button type="button" onClick={toggleTheme} className="btn-ghost mt-3">
          Switch to {isDark ? 'light' : 'dark'} mode
        </button>
      </div>

      <div className="card-flat p-5">
        <h2 className="text-sm font-semibold">Adaptive learning</h2>
        <p className="mt-1 text-sm text-(--ink-soft)">
          When enabled, Luminoesis measures timing only (how you type, not what you type) to build a private baseline.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${
              optIn ? 'border-(--emerald)/30 bg-(--emerald-muted) text-(--veridian-strong)' : 'border-(--line) bg-(--surface-muted) text-(--ink-soft)'
            }`}
          >
            {optIn ? 'Opted in' : optIn === false ? 'Off' : 'Not asked'}
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn-ghost text-xs" onClick={() => void handleOptIn(true)}>
              Opt in
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={() => void handleOptIn(false)}>
              Opt out
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-(--ink-soft)">
          Opt out keeps full study functionality; it simply uses standard scheduling.
        </p>
      </div>

      <div className="card-flat p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={16} aria-hidden="true" /> Privacy &amp; data
        </h2>
        <p className="mt-1 text-sm text-(--ink-soft)">
          See exactly what is measured and what stays on device. Export or delete everything in one tap.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/privacy" className="btn-primary inline-flex items-center gap-2 no-underline">
            <ShieldCheck size={16} aria-hidden="true" /> Open Privacy
          </Link>
          <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => void handleExport()}>
            <Download size={16} aria-hidden="true" /> Export everything
          </button>
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-2 border-(--destructive)/30 text-destructive hover:bg-(--destructive)/10"
            onClick={() => void handleDelete()}
          >
            <Trash2 size={16} aria-hidden="true" /> Delete all data
          </button>
        </div>
      </div>

      <div className="card-flat p-5">
        <h2 className="text-sm font-semibold">On-device AI model</h2>
        <p className="mt-1 text-sm text-(--ink-soft)">
          Standard is fast and always available offline. Capable answers harder
          questions but downloads about 1 GB on first use.
        </p>
        <div
          className="mt-3 flex gap-2"
          role="radiogroup"
          aria-label="On-device AI model"
        >
          {(
            [
              { value: 'standard', label: 'Standard · 360M' },
              { value: 'capable', label: 'Capable · 1.7B' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={modelTier === option.value}
              onClick={() => {
                setModelTier(option.value)
                void settingsRepository.setLocalModelTier(option.value)
              }}
              className={`card-flat px-4 py-2 text-sm transition ${
                modelTier === option.value ? 'ring-2 ring-(--veridian)' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-(--ink-soft)">
          If the capable build fails to load, answers silently fall back to Standard.
        </p>
      </div>

      <div className="card-flat p-5">
        <h2 className="text-sm font-semibold">Online tutor escalation</h2>
        <p className="mt-1 text-sm text-(--ink-soft)">
          Off by default. When on, only questions the on-device model answers
          poorly are sent to Gemini — with your excerpt and question leaving
          this device. Everything else stays local.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${
              escalation ? 'border-(--emerald)/30 bg-(--emerald-muted) text-(--veridian-strong)' : 'border-(--line) bg-(--surface-muted) text-(--ink-soft)'
            }`}
          >
            {escalation ? 'On' : 'Off'}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                setEscalation(true)
                void settingsRepository.setTutorEscalation(true)
              }}
            >
              Turn on
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                setEscalation(false)
                void settingsRepository.setTutorEscalation(false)
              }}
            >
              Turn off
            </button>
          </div>
        </div>
      </div>

      <div className="card-flat p-5">
        <h2 className="text-sm font-semibold">Sync (optional)</h2>
        <p className="mt-1 text-sm text-(--ink-soft)">
          Core study never needs sync. If you run the optional Express + SQLite backend on <code className="rounded bg-(--surface-muted) px-1 py-0.5 font-mono text-xs">:4901</code>, this device can
          push snapshots for your other devices. Cross-device sync controls are still being connected — everything here works fully offline.
        </p>
      </div>
    </div>
  )
}
