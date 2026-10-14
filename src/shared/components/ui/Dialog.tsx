import { useEffect, useRef } from 'react'

type DialogProps = {
  open: boolean
  onClose: () => void
  label: string
  labelledBy?: string
  wide?: boolean
  alignTop?: boolean
  className?: string
  children: React.ReactNode
}

/*
 * Single dialog primitive for the whole app. Native <dialog> in modal
 * mode gives focus containment and Esc for free; we add return-focus
 * and scrim-click close. One implementation, no one-off overlays.
 */
export function Dialog({
  open,
  onClose,
  label,
  labelledBy,
  wide = false,
  alignTop = false,
  className = '',
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) {
      restoreRef.current = document.activeElement as HTMLElement | null
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open ])

  useEffect(() => {
    if (!open) {
      restoreRef.current?.focus()
      restoreRef.current = null
    }
  }, [open ])

  useEffect(() => {
    return () => {
      const dialog = ref.current
      if (dialog?.open) dialog.close()
      const restore = restoreRef.current
      restoreRef.current = null
      if (restore && document.contains(restore)) {
        restore.focus()
      }
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={`app-dialog ${wide ? 'w-full max-w-3xl' : ''} ${alignTop ? 'app-dialog--top' : ''} ${className}`}
    >
      {children}
    </dialog>
  )
}
