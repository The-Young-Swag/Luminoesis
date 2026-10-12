import { useEffect } from 'react'

import type { Grade } from '#/features/review/domain/sm2'

type GradeControlsProps = {
  onGrade: (grade: Grade) => void
}

const SHORTCUTS = ['1', '2', '3', '4'] as const

export function GradeControls({ onGrade }: GradeControlsProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return
      }

      const index = SHORTCUTS.indexOf(
        event.key as (typeof SHORTCUTS)[number],
      )

      if (index >= 0) {
        event.preventDefault()
        onGrade(index as Grade)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () =>
      window.removeEventListener('keydown', onKeyDown)
  }, [onGrade])

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6"
      role="group"
      aria-label="Grade your recall"
    >
      <GradeBtn
        label="Again"
        hint="Forgot"
        shortcut="1"
        color="var(--destructive)"
        onClick={() => onGrade(0)}
      />
      <GradeBtn
        label="Hard"
        hint="Struggled"
        shortcut="2"
        color="var(--warning)"
        onClick={() => onGrade(1)}
      />
      <GradeBtn
        label="Good"
        hint="Recalled"
        shortcut="3"
        color="var(--emerald)"
        onClick={() => onGrade(2)}
      />
      <GradeBtn
        label="Easy"
        hint="Instant"
        shortcut="4"
        color="var(--racing)"
        onClick={() => onGrade(3)}
      />
    </div>
  )
}

function GradeBtn({
  label,
  hint,
  shortcut,
  color,
  onClick,
}: {
  label: string
  hint: string
  shortcut: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-keyshortcuts={shortcut}
      aria-label={`${label} — ${hint} (shortcut ${shortcut})`}
      className="rounded-xl border border-(--line) bg-(--surface) p-3 text-left transition-colors hover:bg-(--surface-muted) focus-visible:outline-2"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <kbd
          aria-hidden="true"
          className="rounded border border-(--line) bg-(--surface-muted) px-1.5 py-0.5 font-mono text-[10px] text-(--ink-faint)"
        >
          {shortcut}
        </kbd>
      </div>
      <div className="mt-0.5 text-xs text-(--ink-soft)">{hint}</div>
    </button>
  )
}