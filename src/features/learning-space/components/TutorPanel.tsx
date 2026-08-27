import { useState } from 'react'
import { Sparkles, CornerDownLeft } from 'lucide-react'

type TutorMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const HONEST_BOUNDARY_MESSAGE =
  "Luminoesis keeps your material on-device and never sends it to a server. AI tutoring isn't connected in this build yet — but your concepts, highlights and review history are all captured here, so a tutor can use them the moment it's enabled."

export function TutorPanel({
  materialTitle,
  context,
}: {
  materialTitle: string
  context?: string
}) {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      text: `This is the AI Tutor for “${materialTitle}”. Ask about the material, and it will ground answers in your concepts and review history.`,
    },
  ])
  const [draft, setDraft] = useState('')

  function send() {
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
  }

  return (
    <section
      className="card-flat flex h-full min-h-[420px] flex-col overflow-hidden"
      aria-label="AI Tutor"
    >
      <header className="border-b border-(--line) px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles
            size={16}
            className="text-(--blue)"
            aria-hidden="true"
          />
          <p className="mono-label">AI Tutor</p>
          <span className="chip">preview</span>
        </div>
        <p className="mt-1 text-xs text-(--ink-faint)">
          Not connected to an AI service.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'flex justify-end'
                : 'flex justify-start'
            }
          >
            <p
              className={
                message.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-(--blue) px-3 py-2 text-sm text-white'
                  : 'max-w-[90%] rounded-2xl rounded-bl-sm bg-(--surface-muted) px-3 py-2 text-sm text-(--ink)'
              }
            >
              {message.text}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-(--line) p-3">
        {context && (
          <div className="mb-3 rounded-lg border border-(--line) bg-(--surface-muted) px-3 py-2 text-xs text-(--ink-soft)">
            <span className="font-medium text-(--ink)">From your selection: </span>
            <span className="line-clamp-2">{context}</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
            rows={2}
            placeholder="Ask about this material…"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-(--line) bg-(--surface) px-3 py-2 text-sm text-(--ink) outline-none transition focus:border-(--blue)"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim()}
            className="btn-primary flex h-[44px] items-center gap-1.5 px-3 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <CornerDownLeft size={16} aria-hidden="true" />
            Send
          </button>
        </div>
      </div>
    </section>
  )
}
