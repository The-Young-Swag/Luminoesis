import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CornerDownLeft, Sparkles } from 'lucide-react'

type TutorMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const HONEST_BOUNDARY_MESSAGE =
  "Luminoesis keeps your material on-device and never sends it to a server. AI tutoring isn't connected in this build yet — but your concepts, highlights and review history are all captured here, so a tutor can use them the moment it's enabled."

export type TutorPanelHandle = {
  focusInput: () => void
}

type TutorPanelProps = {
  materialTitle: string
  context?: string
  /** Optional control (e.g. a collapse button) rendered in the header, next to the Preview chip. */
  headerAction?: React.ReactNode
}

export const TutorPanel = forwardRef<TutorPanelHandle, TutorPanelProps>(
  function TutorPanelImpl({ materialTitle, context, headerAction }, ref) {
    const [messages, setMessages] = useState<TutorMessage[]>(() => [
      {
        id: 'intro',
        role: 'assistant',
        text: `This is the AI Tutor for "${materialTitle}". Ask about the material, and it will ground answers in your concepts and review history.`,
      },
    ])
    const [draft, setDraft] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(
      ref,
      () => ({
        focusInput: () => textareaRef.current?.focus(),
      }),
      [],
    )

    const send = useCallback(() => {
      const text = draft.trim()

      if (!text) {
        return
      }

      setMessages((prev) => [
        ...prev,
        { id: `u-${prev.length}`, role: 'user', text },
        { id: `a-${prev.length}`, role: 'assistant', text: HONEST_BOUNDARY_MESSAGE },
      ])
      setDraft('')
    }, [draft])

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          send()
        }
      },
      [send],
    )

    const canSend = useMemo(() => draft.trim().length > 0, [draft])

    return (
      <div className="flex h-full min-h-0 flex-col bg-(--surface)/40">
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-(--blue)/12 text-(--blue)">
              <Sparkles size={15} aria-hidden="true" />
            </span>
            <p className="font-mono text-[11px] font-semibold tracking-[0.08em] text-(--ink-faint) uppercase">
              Ask Tutor
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="chip">Preview</span>
            {headerAction}
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          {messages.map((message) => (
            <TutorMessageBubble key={message.id} message={message} />
          ))}
        </div>

        <div className="shrink-0 border-t border-(--line)/70 p-4">
          {context && (
            <div className="mb-3 rounded-xl border border-(--line)/70 bg-(--surface-muted)/70 px-3.5 py-2.5 text-xs text-(--ink-soft)">
              <span className="font-medium text-(--ink)">From your selection: </span>
              <span className="line-clamp-2">{context}</span>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-(--line)/80 bg-(--surface) p-2 pl-3.5 shadow-sm transition focus-within:border-(--blue) focus-within:ring-2 focus-within:ring-(--blue)/15">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about this material…"
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed text-(--ink) outline-none placeholder:text-(--ink-faint)"
            />

            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              aria-label="Send message"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-(--blue)/12 text-(--blue) transition hover:bg-(--blue)/20 disabled:cursor-not-allowed disabled:opacity-40"
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
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-(--blue) px-4 py-2.5 text-[13.5px] leading-relaxed text-white">
          {message.text}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--surface-muted) text-(--blue)">
        <Sparkles size={12} aria-hidden="true" />
      </span>

      <p className="max-w-[92%] pt-0.5 text-[13.5px] leading-relaxed text-(--ink-soft)">
        {message.text}
      </p>
    </div>
  )
}