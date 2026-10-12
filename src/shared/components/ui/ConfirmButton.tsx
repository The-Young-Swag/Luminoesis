import { useEffect, useRef, useState } from 'react'

type ConfirmButtonProps = {
  label: string
  confirmLabel?: string
  title?: string
  disabled?: boolean
  className?: string
  confirmClassName?: string
  onConfirm: () => void
  children: React.ReactNode
}

/**
 * Two-step inline delete: first click arms, second click confirms.
 * Disarms on blur, Escape, or after 4 seconds. Keyboard-focusable at
 * every step so it never hides the action from keyboard users.
 */
export function ConfirmButton({
  label,
  confirmLabel = 'Confirm?',
  title,
  disabled = false,
  className = '',
  confirmClassName = '',
  onConfirm,
  children,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!armed) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setArmed(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [armed])

  if (armed) {
    return (
      <button
        type="button"
        autoFocus
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          if (resetTimer.current !== null) {
            window.clearTimeout(resetTimer.current)
            resetTimer.current = null
          }
          setArmed(false)
          onConfirm()
        }}
        onBlur={() => setArmed(false)}
        className={`inline-flex items-center gap-1 rounded-lg bg-(--destructive) px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-(--destructive)/40 ${confirmClassName}`}
      >
        {confirmLabel}
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => {
        if (resetTimer.current !== null) {
          window.clearTimeout(resetTimer.current)
        }
        setArmed(true)
        resetTimer.current = window.setTimeout(() => setArmed(false), 4000)
      }}
      className={className}
    >
      {children}
    </button>
  )
}
