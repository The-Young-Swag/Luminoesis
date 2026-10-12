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
import type { TutorMessage } from '#/features/tutor/domain/tutor'

type TutorPanelProps = {
  materialTitle: string
  materialId?: string
  learningSpaceId: string
  context?: string
  onContextConsumed?: () => void
  headerAction?: React.ReactNode
  hideHeader?: boolean
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
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const endRef = useRef<HTMLDivElement>(null)

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
        })

        const assistantMessage: TutorMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: response.text,
          provider: response.provider,
          execution: response.execution,
          citation: response.citation,
        }

        setMessages((previousMessages) => [
          ...previousMessages,
          assistantMessage,
        ])

        onContextConsumed?.()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Tutor failed.'

        setMessages((previousMessages) => [
          ...previousMessages,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: message,
          },
        ])
      } finally {
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

    return (
      <div className="flex h-full min-h-0 flex-col bg-transparent">
        {!hideHeader && (
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-(--glass-border) px-6 py-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-(--blue)/10 text-(--blue)">
                <Sparkles size={15} aria-hidden="true" />
              </span>

              <p className="font-mono text-[11px] font-semibold tracking-[0.08em] text-(--ink-faint) uppercase">
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
          {messages.map((message) => (
            <TutorMessageBubble
              key={message.id}
              message={message}
            />
          ))}

          {sending && (
            <div
              className="flex items-start gap-3"
              role="status"
              aria-live="polite"
              aria-label="Tutor is thinking"
            >
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--surface-muted) text-(--blue)">
                <Sparkles size={12} aria-hidden="true" />
              </span>

              <p className="pt-0.5 text-[14px] leading-relaxed text-(--ink-faint)">
                Thinking…
              </p>
            </div>
          )}

          <div ref={endRef} aria-hidden="true" />
        </div>

        <div className="shrink-0 border-t border-(--glass-border) p-5">
          {context && (
            <div className="mb-3 flex gap-3 rounded-xl bg-(--surface-muted)/60 px-4 py-3.5">
              <Info
                size={15}
                className="mt-0.5 shrink-0 text-(--ink-faint)"
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
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[14px] leading-relaxed text-(--ink) outline-none placeholder:text-(--ink-faint)"
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
              <p className="mb-1 font-medium text-(--ink-faint)">
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
          <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-(--ink-faint)">
            {message.execution === 'on-device'
              ? 'Local AI · Generated on-device · No data sent externally.'
              : 'Local AI · On-device model unavailable · No data sent externally.'}
          </p>
        )}

        {message.provider === 'gemini' && (
          <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-(--ink-faint)">
            Gemini · Online AI
          </p>
        )}
      </div>
    </div>
  )
}