import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { CornerDownLeft, Info, Sparkles } from 'lucide-react'

import { tutorService } from '#/features/tutor/application/tutorService'
import { localTutorProvider } from '#/features/tutor/providers/localTutorProvider'
import { settingsRepository } from '#/shared/repositories/settingsRepository'
import type { TutorMessage } from '#/features/tutor/domain/tutor'

type TutorPanelProps = {
  materialTitle: string
  materialId?: string
  learningSpaceId: string
  context?: string
  onContextConsumed?: () => void
  headerAction?: React.ReactNode
  hideHeader?: boolean
  active?: boolean
}

export type TutorPanelHandle = {
  focusInput: () => void
}

export const TutorPanel = forwardRef<TutorPanelHandle, TutorPanelProps>(
  function TutorPanelImpl(
    {
      materialTitle,
      materialId,
      learningSpaceId,
      context,
      onContextConsumed,
      headerAction,
      hideHeader = false,
      active = true,
    },
    ref,
  ) {
    const [messages, setMessages] = useState<TutorMessage[]>(() => [
      {
        id: 'intro',
        role: 'assistant',
        text: `This is the AI Tutor for “${materialTitle}”. Ask about the material — answers stay grounded in your concepts and review history. Local AI works offline.`,
      },
    ])

    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [streamingId, setStreamingId] = useState<string | null>(null)
    const [escalating, setEscalating] = useState(false)
    const escalatingRef = useRef(false)
    const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
    const [modelProgress, setModelProgress] = useState(0)
    const [modelFile, setModelFile] = useState('')
    const [escalationOn, setEscalationOn] = useState(false)
    const escalationOnRef = useRef(false)
    const preloadedRef = useRef(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const endRef = useRef<HTMLDivElement>(null)

    /*
     * Load the on-device model when the panel opens — not when the
     * material view mounts — so the first question starts instantly.
     * Persist storage so weights survive eviction and never re-download.
     */
    useEffect(() => {
      if (!active || preloadedRef.current) return
      preloadedRef.current = true
      setModelStatus('loading')

      try {
        void navigator.storage?.persist?.()?.catch(() => {})
      } catch {
        // Persistence is a nicety, never a blocker.
      }

      void settingsRepository
        .getTutorEscalation()
        .then((value) => {
          setEscalationOn(value)
          escalationOnRef.current = value
        })
        .catch(() => {})

      void localTutorProvider
        .preload(undefined, (fraction, file) => {
          setModelProgress(fraction)
          setModelFile(file)
        })
        .then((ready) => setModelStatus(ready ? 'ready' : 'unavailable'))
        .catch(() => setModelStatus('unavailable'))
    }, [active])

    /*
     * Titles load async, but the intro is snapshotted at mount. Refresh it
     * while the conversation is still pristine so it never names the
     * wrong material.
     */
    useEffect(() => {
      setMessages((previousMessages) => {
        if (
          previousMessages.length !== 1 ||
          previousMessages[0]?.id !== 'intro'
        ) {
          return previousMessages
        }
        return [
          {
            id: 'intro',
            role: 'assistant',
            text: `This is the AI Tutor for “${materialTitle}”. Ask about the material — answers stay grounded in your concepts and review history. Local AI works offline.`,
          },
        ]
      })
    }, [materialTitle])

    useEffect(() => {
      endRef.current?.scrollIntoView({ block: 'nearest' })
    }, [messages.length, sending])

    useImperativeHandle(
      ref,
      () => ({
        focusInput: () => textareaRef.current?.focus(),
      }),
      [],
    )

    const send = useCallback(async () => {
      const text = draft.trim()

      if (!text || sending) {
        return
      }

      /*
       * Snapshot the selection before the request begins.
       *
       * The parent consumes the selection after the request completes,
       * so the submitted message must retain its own copy.
       */
      const selectedText = context?.trim() || undefined

      const userMessage: TutorMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
        selectedText,
      }
      
      const conversationHistory = messages
        .filter((message) => message.id !== 'intro')
        .map((message) => ({
          role: message.role,
          text: message.text,
          selectedText: message.selectedText,
        }))
      
      setMessages((previousMessages) => [
        ...previousMessages,
        userMessage,
      ])

      const assistantId = `a-${Date.now()}`
      setMessages((previousMessages) => [
        ...previousMessages,
        { id: assistantId, role: 'assistant', text: '' },
      ])
      setStreamingId(assistantId)

      setDraft('')
      setSending(true)

      try {
        const response = await tutorService.ask({
          materialId,
          materialTitle,
          selectedText,
          learningSpaceId,
          prompt: text,
          conversationHistory,
          localTimeoutMs: 60000,
          onToken: (chunk) => {
            // Escalation armed: hold local tokens back so a weak answer
            // never flashes first. Tokens arriving after escalation
            // starts are Gemini's — stream those.
            if (!escalatingRef.current && escalationOnRef.current) return
            setMessages((previousMessages) =>
              previousMessages.map((message) =>
                message.id === assistantId
                  ? { ...message, text: message.text + chunk }
                  : message,
              ),
            )
          },
          onEscalationStart: () => {
            escalatingRef.current = true
            setEscalating(true)
          },
        })

        setMessages((previousMessages) =>
          previousMessages.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  text: response.text,
                  provider: response.provider,
                  execution: response.execution,
                  citation: response.citation,
                }
              : message,
          ),
        )

        onContextConsumed?.()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Tutor failed.'

        setMessages((previousMessages) =>
          previousMessages.map((previous) =>
            previous.id === assistantId
              ? { ...previous, text: message }
              : previous,
          ),
        )
      } finally {
        escalatingRef.current = false
        setEscalating(false)
        setStreamingId(null)
        setSending(false)
      }
    }, [
      context,
      draft,
      learningSpaceId,
      materialId,
      materialTitle,
      onContextConsumed,
      sending,
    ])

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey) {
          return
        }

        event.preventDefault()
        void send()
      },
      [send],
    )

    const canSend = useMemo(
      () => draft.trim().length > 0 && !sending,
      [draft, sending],
    )

    const waitingForFirstToken =
      streamingId !== null &&
      !messages.some(
        (message) => message.id === streamingId && message.text.length > 0,
      )

    const showEscalationStatus = escalating && waitingForFirstToken

    return (
      <div className="flex h-full min-h-0 flex-col bg-transparent">
        {!hideHeader && (
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-(--glass-border) px-6 py-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-(--blue)/10 text-(--blue)">
                <Sparkles size={15} aria-hidden="true" />
              </span>

              <p className="font-mono text-[11px] font-semibold tracking-[0.08em] text-(--ink-soft) uppercase">
                Ask Tutor
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="chip">Local AI</span>

              <span className="chip text-[10px] text-(--blue)">
                Gemini — Coming soon
              </span>

              {headerAction}
            </div>
          </header>
        )}

        <div
          className="sidebar-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Tutor conversation"
        >
          {messages.map((message) => {
            if (message.role === 'assistant' && message.text === '') {
              return null
            }
            return (
              <TutorMessageBubble
                key={message.id}
                message={message}
              />
            )
          })}

          {waitingForFirstToken && (
            <div
              className="flex items-start gap-3"
              role="status"
              aria-live="polite"
              aria-label={showEscalationStatus ? 'Checking with the cloud tutor' : 'Tutor is thinking'}
            >
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--surface-muted) text-(--blue)">
                <Sparkles size={12} aria-hidden="true" />
              </span>

              <p className="pt-0.5 text-[14px] leading-relaxed text-(--ink-faint)">
                {showEscalationStatus ? 'Checking with the cloud tutor…' : 'Thinking…'}
              </p>
            </div>
          )}

          <div ref={endRef} aria-hidden="true" />
        </div>

        <div className="shrink-0 border-t border-(--glass-border) p-5">
          {escalationOn && (
            <p className="mb-3 rounded-xl border border-(--warning)/30 bg-(--warning-muted) px-3 py-2 text-xs leading-5 text-(--warning-strong)">
              Escalation is on — questions the on-device model answers poorly
              are sent to Gemini with your excerpt. Turn it off in Settings.
            </p>
          )}

          {modelStatus === 'loading' && (
            <div className="mb-3" role="status" aria-live="polite">
              <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] text-(--ink-soft)">
                <span className="truncate">
                  Downloading on-device model{modelFile ? ` · ${modelFile}` : ''}…
                </span>
                <span className="shrink-0 tabular-nums">
                  {Math.round(modelProgress * 100)}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Model download progress"
                aria-valuenow={Math.round(modelProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-1.5 h-1 overflow-hidden rounded-full bg-(--surface-muted)"
              >
                <div
                  className="h-full w-full origin-left rounded-full bg-(--veridian) transition-transform duration-300"
                  style={{ transform: `scaleX(${modelProgress})` }}
                />
              </div>
            </div>
          )}

          {context && (
            <div className="mb-3 flex gap-3 rounded-xl bg-(--surface-muted)/60 px-4 py-3.5">
              <Info
                size={15}
                className="mt-0.5 shrink-0 text-(--ink-soft)"
                aria-hidden="true"
              />

              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-(--ink)">
                  From your selection
                </p>

                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-(--ink-soft)">
                  {context}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-(--glass-border) bg-(--glass-bg) p-3 pl-4 shadow-sm transition focus-within:border-(--blue) focus-within:ring-2 focus-within:ring-(--blue)/15">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about this material…"
              aria-label="Ask Tutor about this material"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[14px] leading-relaxed text-(--ink) outline-none placeholder:text-(--ink-soft)"
            />

            <button
              type="button"
              onClick={() => void send()}
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

function TutorMessageBubble({
  message,
}: {
  message: TutorMessage
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] space-y-1.5">
          {message.selectedText && (
            <div className="rounded-xl bg-(--glass-bg-strong)/60 px-3.5 py-2.5 text-xs leading-relaxed text-(--ink-soft)">
              <p className="mb-1 font-medium text-(--ink-soft)">
                Selected passage
              </p>
  
              <p className="line-clamp-3">
                {message.selectedText}
              </p>
            </div>
          )}
  
          <p className="rounded-[13px_13px_4px_13px] border border-(--blue)/25 bg-(--blue)/12 px-3.5 py-2.5 text-[13.5px] leading-normal text-(--ink) shadow-sm">
            {message.text}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--glass-bg-strong) text-(--blue)">
        <Sparkles size={12} aria-hidden="true" />
      </span>

      <div className="min-w-0 max-w-[88%]">
        <p className="rounded-[13px_13px_13px_4px] border border-(--glass-border) bg-(--glass-bg)/70 px-3.5 py-2.5 text-[13.5px] leading-normal text-(--ink) backdrop-blur-sm">
          {message.text}
        </p>

        {message.provider === 'local' && (
          <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-(--ink-soft)">
            {message.execution === 'on-device'
              ? 'Local AI · Generated on-device · No data sent externally.'
              : 'Local AI · On-device model unavailable · No data sent externally.'}
          </p>
        )}

        {message.provider === 'gemini' && (
          <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-(--ink-soft)">
            Gemini · Online AI
          </p>
        )}
      </div>
    </div>
  )
}