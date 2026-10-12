import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Brain,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  Library,
  LineChart,
  Moon,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useTheme } from '#/shared/hooks/useTheme'
import { Dialog } from '#/shared/components/ui/Dialog'
import { readRecentRoutes } from '#/shared/components/layout/Sidebar'

type Command = {
  id: string
  label: string
  hint: string
  icon: LucideIcon
  keywords: string
  to?: string
  run?: () => void
}

function buildCommands(toggleTheme: () => void, isDark: boolean): Command[] {
  return [
    { id: 'go-dashboard', label: 'Go to Dashboard', hint: 'Overview', icon: LayoutDashboard, keywords: 'home overview start', to: '/' },
    { id: 'go-spaces', label: 'Go to Learning Spaces', hint: 'Spaces', icon: Layers3, keywords: 'spaces materials concepts', to: '/learning-spaces' },
    { id: 'go-review', label: 'Go to Review', hint: 'Session', icon: GraduationCap, keywords: 'review session study practice', to: '/review' },
    { id: 'go-library', label: 'Go to Library', hint: 'Cards', icon: Library, keywords: 'library cards knowledge', to: '/library' },
    { id: 'go-insights', label: 'Go to Insights', hint: 'Analytics', icon: LineChart, keywords: 'insights analytics stats patterns', to: '/insights' },
    { id: 'go-flashcards', label: 'Go to Flashcards', hint: 'Decks', icon: Brain, keywords: 'flashcards decks', to: '/flashcards' },
    { id: 'go-privacy', label: 'Go to Privacy', hint: 'Control', icon: ShieldCheck, keywords: 'privacy data export delete control', to: '/privacy' },
    { id: 'go-settings', label: 'Go to Settings', hint: 'Preferences', icon: Settings2, keywords: 'settings preferences options', to: '/settings' },
    { id: 'act-review', label: 'Start focused review', hint: 'Action', icon: GraduationCap, keywords: 'start review session now', to: '/review' },
    { id: 'act-add', label: 'Add study card', hint: 'Action', icon: Plus, keywords: 'add new card create', to: '/library' },
    {
      id: 'act-theme',
      label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
      hint: 'Action',
      icon: isDark ? Sun : Moon,
      keywords: 'theme dark light mode appearance',
      run: toggleTheme,
    },
  ]
}

export function openCommandPalette(): void {
  window.dispatchEvent(new CustomEvent('luminoesis:open-palette'))
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { theme, toggleTheme } = useTheme()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo(
    () => buildCommands(toggleTheme, theme === 'dark'),
    [toggleTheme, theme],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((command) =>
      `${command.label} ${command.hint} ${command.keywords}`
        .toLowerCase()
        .includes(q),
    )
  }, [commands, query])

  const recentResults = useMemo(() => {
    if (query.trim()) return []
    const recent = readRecentRoutes().filter((to) => to !== pathname)
    return recent
      .map((to) => commands.find((command) => command.to === to && command.id.startsWith('go-')))
      .filter((command): command is Command => command !== undefined)
  }, [commands, query, pathname])

  const allResults = [...recentResults, ...results.filter((command) => !recentResults.includes(command))]

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  if (!open) return null

  const runCommand = (command: Command) => {
    onClose()
    if (command.run) {
      command.run()
    } else if (command.to) {
      void navigate({ to: command.to })
    }
  }

  const onInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (allResults.length ? (index + 1) % allResults.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) =>
        allResults.length ? (index - 1 + allResults.length) % allResults.length : 0,
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const command = allResults[active]
      if (command) runCommand(command)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Command palette"
      alignTop
      className="w-full max-w-lg overflow-hidden p-0"
    >
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-(--line) px-4">
          <Search size={16} aria-hidden="true" className="shrink-0 text-(--ink-faint)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={allResults.length ? `${listId}-${active}` : undefined}
            aria-label="Type a command or search"
            placeholder="Type a command or search…"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full bg-transparent text-[15px] text-(--ink) outline-none placeholder:text-(--ink-faint)"
          />
          <kbd
            aria-hidden="true"
            className="shrink-0 rounded border border-(--line) bg-(--surface-muted) px-1.5 py-0.5 font-mono text-[10px] text-(--ink-faint)"
          >
            ESC
          </kbd>
        </div>

        <ul
          id={listId}
          role="listbox"
          aria-label="Commands"
          className="sidebar-scroll max-h-[40vh] overflow-y-auto p-2"
        >
          {allResults.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-(--ink-faint)">
              No matches. Try “review”, “library” or “theme”.
            </li>
          )}

          {allResults.map((command, index) => {
            const Icon = command.icon
            const selected = index === active
            return (
              <li key={command.id} id={`${listId}-${index}`} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => runCommand(command)}
                  onMouseMove={() => setActive(index)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selected ? 'bg-(--racing) text-white' : 'text-(--ink)'
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      selected
                        ? 'bg-white/15 text-white'
                        : 'border border-(--line) bg-(--surface-muted) text-(--ink-soft)'
                    }`}
                  >
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {command.label}
                  </span>
                  <span
                    className={`mono-label text-[10px] ${selected ? 'text-white/70' : ''}`}
                  >
                    {command.hint}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-3 border-t border-(--line) px-4 py-2.5 font-mono text-[10px] tabular-nums text-(--ink-soft)">
          <span>↑↓ navigate</span>
          <span>Enter select</span>
          <span className="ml-auto">Ctrl/⌘ K toggles</span>
        </div>
      </div>
    </Dialog>
  )
}
