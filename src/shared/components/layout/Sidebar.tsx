import { Link, useRouterState } from '@tanstack/react-router'
import {
  GraduationCap,
  Layers3,
  LayoutDashboard,
  Library,
  LineChart,
  Menu,
  Moon,
  MoreHorizontal,
  Settings2,
  ShieldCheck,
  Sun,
  X,
  Brain,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useTheme } from '#/shared/hooks/useTheme'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  meta: string
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    icon: LayoutDashboard,
    meta: 'OVERVIEW',
  },
  {
    to: '/learning-spaces',
    label: 'Learning Spaces',
    icon: Layers3,
    meta: 'SPACES',
  },
  {
    to: '/review',
    label: 'Review',
    icon: GraduationCap,
    meta: 'SESSION',
  },
  {
    to: '/library',
    label: 'Library',
    icon: Library,
    meta: 'COLLECTION',
  },
  {
    to: '/insights',
    label: 'Insights',
    icon: LineChart,
    meta: 'ANALYTICS',
  },
  {
    to: '/flashcards',
    label: 'Flashcards',
    icon: Brain,
    meta: 'REVIEW',
  },
]

const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    to: '/privacy',
    label: 'Privacy',
    icon: ShieldCheck,
    meta: 'CONTROL',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings2,
    meta: 'PREFS',
  },
]

const MOBILE_TAB_COUNT = 3

const MOBILE_PRIMARY_ITEMS = PRIMARY_NAV_ITEMS.slice(
  0,
  MOBILE_TAB_COUNT,
)

const MOBILE_MORE_ITEMS = [
  ...PRIMARY_NAV_ITEMS.slice(MOBILE_TAB_COUNT),
  ...SECONDARY_NAV_ITEMS,
]

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const isFocusMode = pathname.startsWith('/review')

  useEffect(() => {
    setMobileOpen(false)
    setMoreOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile */}
      <MobileHeader
        focusMode={isFocusMode}
        onOpenNavigation={() => setMobileOpen(true)}
      />

      <MobileBottomNavigation
        focusMode={isFocusMode}
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen((open) => !open)}
      />

      {moreOpen && (
        <MobileMoreSheet
          items={MOBILE_MORE_ITEMS}
          onClose={() => setMoreOpen(false)}
        />
      )}

      {mobileOpen && (
        <MobileDrawer onClose={() => setMobileOpen(false)} />
      )}

      {/* Desktop */}
      <DesktopSidebar focusMode={isFocusMode} />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Mobile header */
/* -------------------------------------------------------------------------- */

type MobileHeaderProps = {
  focusMode: boolean
  onOpenNavigation: () => void
}

function MobileHeader({
  focusMode,
  onOpenNavigation,
}: MobileHeaderProps) {
  return (
    <header
      inert={focusMode}
      aria-hidden={focusMode}
      className={cx(
        'glass-nav fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-(--line) px-4 lg:hidden',
        focusMode &&
          'pointer-events-none -translate-y-full opacity-0',
      )}
    >
      <Link
        to="/"
        className="flex items-center gap-2.5 no-underline"
      >
        <BrandMark />

        <span className="display text-lg tracking-tight text-(--ink)">
          Luminoesis
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenNavigation}
          className="grid h-9 w-9 place-items-center rounded-full bg-(--racing) text-white"
        >
          <Menu size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/* Mobile bottom navigation */
/* -------------------------------------------------------------------------- */

type MobileBottomNavigationProps = {
  focusMode: boolean
  moreOpen: boolean
  onToggleMore: () => void
}

function MobileBottomNavigation({
  focusMode,
  moreOpen,
  onToggleMore,
}: MobileBottomNavigationProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      inert={focusMode}
      aria-hidden={focusMode}
      className={cx(
        'safe-area-pb glass-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-(--line) px-2 py-2 lg:hidden',
        focusMode &&
          'pointer-events-none translate-y-full opacity-0',
      )}
    >
      {MOBILE_PRIMARY_ITEMS.map((item) => (
        <MobileTab key={item.to} item={item} />
      ))}

      <button
        type="button"
        aria-label="More navigation options"
        aria-expanded={moreOpen}
        onClick={onToggleMore}
        className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-(--ink-soft)"
      >
        <MoreHorizontal size={20} aria-hidden="true" />

        <span className="mono-label text-[10px]">
          More
        </span>
      </button>
    </nav>
  )
}

function MobileTab({ item }: { item: NavItem }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-(--ink-soft)"
      activeProps={{
        className:
          'flex flex-col items-center gap-1 rounded-xl bg-(--racing) px-3 py-1.5 text-white',
        'aria-current': 'page',
      }}
    >
      <Icon size={20} aria-hidden="true" />

      <span className="mono-label text-[10px]">
        {item.label}
      </span>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Mobile overlays */
/* -------------------------------------------------------------------------- */

function MobileMoreSheet({
  items,
  onClose,
}: {
  items: NavItem[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
      <button
        type="button"
        aria-label="Close more navigation"
        onClick={onClose}
        className="glass-scrim flex-1"
      />

      <div className="glass-panel space-y-2 rounded-t-2xl border-t border-(--line) p-4">
        {items.map((item) => (
          <MoreNavLink
            key={item.to}
            item={item}
            onNavigate={onClose}
          />
        ))}

        <button
          type="button"
          onClick={onClose}
          className="btn-ghost mt-2 w-full"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function MoreNavLink({
  item,
  onNavigate,
}: {
  item: NavItem
  onNavigate: () => void
}) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl border border-(--line) px-3 py-3 no-underline"
    >
      <Icon
        size={18}
        aria-hidden="true"
        className="text-(--ink-soft)"
      />

      <span className="font-medium text-(--ink)">
        {item.label}
      </span>

      <span className="chip ml-auto">
        {item.meta}
      </span>
    </Link>
  )
}

function MobileDrawer({
  onClose,
}: {
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="glass-scrim flex-1"
      />

      <aside className="glass-nav flex w-75 max-w-[84vw] flex-col border-l border-sidebar-border shadow-2xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <span className="mono-label text-(--ink-faint)">
            Navigation
          </span>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="glass-pill grid h-8 w-8 place-items-center"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Sidebar navigation"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          <SidebarNav onNavigate={onClose} />
        </nav>

        <SidebarFooter />
      </aside>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Desktop sidebar */
/* -------------------------------------------------------------------------- */

function DesktopSidebar({
  focusMode,
}: {
  focusMode: boolean
}) {
  return (
    <aside
      className={cx(
        'sidebar-shell fixed inset-y-0 left-0 z-50 hidden w-70 lg:flex',
        focusMode && 'focus-sidebar',
      )}
    >
      <div className="flex min-h-0 w-full flex-col">
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
          <Link
            to="/"
            className="flex min-w-0 flex-1 items-center gap-3 no-underline"
          >
            <BrandMark />

            <div className="min-w-0 leading-none">
              <div className="display truncate text-xl tracking-tight">
                Luminoesis
              </div>

              <div className="mono-label mt-1 truncate text-(--ink-faint)">
                Adaptive study
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Sidebar navigation"
          className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6"
        >
          <SidebarNav />
        </nav>

        {/* Footer */}
        <SidebarFooter />
      </div>
    </aside>
  )
}

/* -------------------------------------------------------------------------- */
/* Shared navigation */
/* -------------------------------------------------------------------------- */

type SidebarNavProps = {
  onNavigate?: () => void
}

function SidebarNav({
  onNavigate,
}: SidebarNavProps) {
  return (
    <div className="space-y-7">
      <NavSection
        label="Study"
        items={PRIMARY_NAV_ITEMS}
        onNavigate={onNavigate}
      />

      <NavSection
        label="Intelligence"
        items={SECONDARY_NAV_ITEMS}
        onNavigate={onNavigate}
      />
    </div>
  )
}

type NavSectionProps = {
  label: string
  items: NavItem[]
  onNavigate?: () => void
}

function NavSection({
  label,
  items,
  onNavigate,
}: NavSectionProps) {
  return (
    <section>
      <div className="sidebar-kicker mb-2 px-2">
        {label}
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <SidebarNavLink
            key={item.to}
            item={item}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  )
}

type SidebarNavLinkProps = {
  item: NavItem
  onNavigate?: () => void
}

function SidebarNavLink({
  item,
  onNavigate,
}: SidebarNavLinkProps) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="sidebar-link group"
      activeProps={{
        className: 'sidebar-link is-active group',
        'aria-current': 'page',
      }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-(--line) bg-(--surface-muted) transition-colors group-[.is-active]:border-white/20 group-[.is-active]:bg-white/15">
        <Icon
          size={17}
          aria-hidden="true"
          className="text-(--ink-soft) group-[.is-active]:text-white"
        />
      </span>

      <span className="min-w-0 flex-1 leading-none">
        <span className="block truncate text-sm font-medium">
          {item.label}
        </span>

        <span className="mono-label mt-1 block truncate text-[10px] leading-none opacity-60 group-[.is-active]:opacity-80">
          {item.meta}
        </span>
      </span>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Sidebar footer */
/* -------------------------------------------------------------------------- */

function SidebarFooter() {
  return (
    <div className="shrink-0 space-y-3 border-t border-sidebar-border p-4">
      <div className="rounded-xl border border-(--line) bg-(--surface-muted) p-3">
        <div className="mono-label">
          Personal signal
        </div>

        <SignalStatus showLabel />

        <div className="mono-label mt-1 opacity-70">
          On this device · Never key content
        </div>
      </div>

      <ThemeToggle expanded />

      <div className="mono-label text-center opacity-60">
        © 2026 Luminoesis
      </div>
    </div>
  )
}

function SignalStatus({
  showLabel = false,
}: {
  showLabel?: boolean
}) {
  return (
    <div
      className={
        showLabel
          ? 'mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-(--ink-faint)'
          : undefined
      }
    >
      <span
        className="pulse-dot"
        aria-hidden="true"
        title="Personal signal active"
      />

      {showLabel && 'Personal signal active'}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Theme */
/* -------------------------------------------------------------------------- */

function ThemeToggle({
  expanded = false,
}: {
  expanded?: boolean
}) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const Icon = isDark ? Sun : Moon
  const label = isDark ? 'Light mode' : 'Dark mode'

  if (!expanded) {
    return (
      <button
        type="button"
        aria-label={`Switch to ${label.toLowerCase()}`}
        onClick={toggleTheme}
        className="glass-pill grid h-8 w-8 place-items-center"
      >
        <Icon size={14} aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={`Switch to ${label.toLowerCase()}`}
      onClick={toggleTheme}
      className="glass-pill flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
    >
      <span className="flex items-center gap-2">
        <Icon size={16} aria-hidden="true" />
        {label}
      </span>

      <span className="chip">
        {theme}
      </span>
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Brand */
/* -------------------------------------------------------------------------- */

function BrandMark() {
  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-(--racing) text-white shadow-sm">
      <span
        className="pointer-events-none absolute inset-0 rounded-xl opacity-40 blur-md"
        style={{ background: 'var(--emerald)' }}
        aria-hidden="true"
      />

      <span
        className="relative h-3 w-3 rounded-full bg-(--emerald)"
        aria-hidden="true"
      />
    </span>
  )
}