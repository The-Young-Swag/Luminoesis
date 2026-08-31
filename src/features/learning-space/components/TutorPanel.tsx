import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CornerDownLeft, Sparkles, Info } from 'lucide-react'

import { tutorService, fetchGeminiTutor } from '#/features/tutor/application/tutorService'

type TutorMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  provider?: 'local' | 'gemini'
}

export type TutorPanelHandle = {
  focusInput: () => void
}

type TutorPanelProps = {
  materialTitle: string
  materialId?: string
  learningSpaceId: string
  context?: string
  /** Optional control (e.g. a collapse button) rendered in the header, next to the Preview chip. */
  headerAction?: React.ReactNode
}

export const TutorPanel = forwardRef<TutorPanelHandle, TutorPanelProps>(
  function TutorPanelImpl({ materialTitle, materialId, learningSpaceId, context, headerAction }, ref) {
    const [messages, setMessages] = useState<TutorMessage[]>(() => [
      {
        id: 'intro',
        role: 'assistant',
        text: `This is the AI Tutor for "${materialTitle}". Ask about the material — answers are grounded in your concepts and review history. Local preview works offline; online Tutor (Gemini fallback) is limited to 3 uploads for this demo.`,
      },
    ])
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(
      ref,
      () => ({
        focusInput: () => textareaRef.current?.focus(),
      }),
      [],
    )

    useEffect(() => {
      const base = import.meta.env.VITE_SYNC_URL ?? 'http://localhost:4901'
      fetch(`${base.replace(/\/$/, '')}/tutor/quota`, { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.remaining === 'number') {
            setQuota({ remaining: data.remaining, limit: data.limit })
          }
        })
        .catch(() => {})
    }, [])

    const send = useCallback(async () => {
      const text = draft.trim()
      if (!text || sending) return

      const userMsg: TutorMessage = { id: `u-${Date.now()}`, role: 'user', text }
      setMessages((prev) => [...prev, userMsg])
      setDraft('')
      setSending(true)

      try {
        // Prefer gemini only if user explicitly wants online? For now,
        // always use local-first; gemini is reachable via explicit fallback.
        // If quota exhausted, local still works.
        const useGemini = false
        const service = useGemini
          ? new (await import('#/features/tutor/application/tutorService')).TutorService(
              (await import('#/features/tutor/providers/localTutorProvider')).localTutorProvider,
              fetchGeminiTutor,
            )
          : tutorService

        const response = await service.ask({
          materialId,
          materialTitle,
          selectedText: context,
          learningSpaceId,
          prompt: text,
          prefer: useGemini ? 'gemini' : 'local',
        })

        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: response.text, provider: response.provider },
        ])

        if (response.provider === 'gemini') {
          const base = import.meta.env.VITE_SYNC_URL ?? 'http://localhost:4901'
          fetch(`${base.replace(/\/$/, '')}/tutor/quota`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && typeof data.remaining === 'number') {
                setQuota({ remaining: data.remaining, limit: data.limit })
              }
            })
            .catch(() => {})
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Tutor failed.'
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: message },
        ])
      } finally {
        setSending(false)
      }
    }, [draft, sending, materialId, materialTitle, learningSpaceId, context])

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          send()
        }
      },
      [send],
    )

    const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending])

    return (
      <div className="flex h-full min-h-0 flex-col bg-transparent">
        <header className="flex shrink-0 items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-(--blue)/10 text-(--blue)">
              <Sparkles size={15} aria-hidden="true" />
            </span>
            <p className="font-mono text-[11px] font-semibold tracking-[0.08em] text-(--ink-faint) uppercase">
              Ask Tutor
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="chip">Preview</span>
            {quota && <span className="chip text-[10px]">{quota.remaining}/{quota.limit} online left</span>}
            {headerAction}
          </div>
        </header>

        {quota && quota.remaining <= 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="mx-6 mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-100"
          >
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>You&apos;ve used all {quota.limit} online Tutor uploads available for this demo. Local AI may still work, and all non-AI learning features continue working.</span>
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="mx-6 mb-4 flex gap-2.5 rounded-xl border border-(--line)/60 bg-(--surface-muted)/60 px-4 py-3 text-xs leading-relaxed text-(--ink-soft)"
          >
            <Info size={14} className="mt-0.5 shrink-0 text-(--ink-faint)" aria-hidden="true" />
            <span>
              Online Tutor uses Gemini when local AI isn&apos;t available. This demo allows up to {quota?.limit ?? 3} online material uploads. Selected learning context is sent to the online AI provider to generate a response.
            </span>
          </div>
        )}

        <div
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Tutor conversation"
        >
          {messages.map((message) => (
            <TutorMessageBubble key={message.id} message={message} />
          ))}
          {sending && (
            <div className="flex items-start gap-3" role="status" aria-live="polite" aria-label="Tutor is thinking">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--surface-muted) text-(--blue)">
                <Sparkles size={12} aria-hidden="true" />
              </span>
              <p className="pt-0.5 text-[14px] leading-relaxed text-(--ink-faint)">Thinking…</p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-(--line)/60 p-5">
          {context && (
            <div className="mb-3 rounded-xl border border-(--line)/60 bg-(--surface-muted)/60 px-4 py-3 text-xs leading-relaxed text-(--ink-soft)">
              <span className="font-medium text-(--ink)">From your selection: </span>
              <span className="line-clamp-2">{context}</span>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-(--line)/70 bg-(--surface) p-3 pl-4 shadow-sm transition focus-within:border-(--blue) focus-within:ring-2 focus-within:ring-(--blue)/15">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about this material…"
              aria-label="Ask Tutor about this material"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[14px] leading-relaxed text-(--ink) outline-none placeholder:text-(--ink-faint)"
            />

            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              aria-label="Send message"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-(--blue)/10 text-(--blue) transition hover:bg-(--blue)/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CornerDownLeft size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    )
  },
)

function TutorMessageBubble({ message }: { message: TutorMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <p className="max-w-[82%] rounded-2xl rounded-br-md bg-(--blue) px-4 py-3 text-[14px] leading-relaxed text-white shadow-sm">
          {message.text}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--surface-muted) text-(--blue)">
        <Sparkles size={12} aria-hidden="true" />
      </span>

      <p className="max-w-[88%] pt-0.5 text-[14px] leading-[1.6] text-(--ink-soft)">
        {message.text}
      </p>
    </div>
  )
}