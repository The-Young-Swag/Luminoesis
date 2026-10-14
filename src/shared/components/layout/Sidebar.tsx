import { Link, useRouterState } from '@tanstack/react-router'
import {
  GraduationCap,
  Landmark,
  Layers3,
  LayoutDashboard,
  Library,
  LineChart,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Sun,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useTheme } from '#/shared/hooks/useTheme'
import { db } from '#/shared/lib/db/dexie'
import { CommandPalette } from '#/shared/components/command/CommandPalette'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: LayoutDashboard },
  { to: '/learning-spaces', label: 'Spaces', icon: Layers3 },
  { to: '/review', label: 'Review', icon: GraduationCap },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/insights', label: 'Insights', icon: LineChart },
]

const SYSTEM_NAV_ITEMS: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

const MOBILE_TABS = PRIMARY_NAV_ITEMS

const RECENT_ROUTES_KEY = 'luminoesis:recent-routes'
const RECENT_ROUTES_LIMIT = 5

export function recordRouteVisit(pathname: string): void {
  const known = [...PRIMARY_NAV_ITEMS, ...SYSTEM_NAV_ITEMS].some(
    (item) => item.to === pathname,
  )
  if (!known) return

  try {
    const stored = window.localStorage.getItem(RECENT_ROUTES_KEY)
    const previous = stored ? (JSON.parse(stored) as string[]) : []
    const next = [pathname, ...previous.filter((entry) => entry !== pathname)].slice(
      0,
      RECENT_ROUTES_LIMIT,
    )
    window.localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next))
  } catch {
    // History is a nicety — never break navigation over storage.
  }
}

export function readRecentRoutes(): string[] {
  try {
    const stored = window.localStorage.getItem(RECENT_ROUTES_KEY)
    const parsed = stored ? (JSON.parse(stored) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
  } catch {
    return []
  }
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function useDueCount(pathname: string): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const due = await db.cards.where('dueDate').belowOrEqual(todayKey()).count()
        if (!cancelled) setCount(due)
      } catch {
        if (!cancelled) setCount(null)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [pathname])

  return count
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const isFocusMode = pathname.startsWith('/review')

  useEffect(() => {
    setMobileOpen(false)
    setPaletteOpen(false)
    recordRouteVisit(pathname)
  }, [pathname])

  useEffect(() => {
    const toggle = () => setPaletteOpen((open) => !open)
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggle()
      }
    }
    const onOpenEvent = () => setPaletteOpen(true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('luminoesis:open-palette', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('luminoesis:open-palette', onOpenEvent)
    }
  }, [])

  const openPalette = () => setPaletteOpen(true)

  return (
    <>
      <MobileHeader
        focusMode={isFocusMode}
        onOpenNavigation={() => setMobileOpen(true)}
        onOpenPalette={openPalette}
      />

      <MobileTabBar focusMode={isFocusMode} />

      {mobileOpen && (
        <MobileDrawer onClose={() => setMobileOpen(false)} />
      )}

      <DesktopSidebar focusMode={isFocusMode} pathname={pathname} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Mobile header */
/* -------------------------------------------------------------------------- */

type MobileHeaderProps = {
  focusMode: boolean
  onOpenNavigation: () => void
  onOpenPalette: () => void
}

function MobileHeader({
  focusMode,
  onOpenNavigation,
  onOpenPalette,
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
        <BrandMark size={32} />

        <span className="display text-lg tracking-tight text-(--ink)">
          Luminoesis
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Open command palette"
          onClick={onOpenPalette}
          className="glass-pill grid h-11 w-11 place-items-center"
        >
          <Search size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenNavigation}
          className="grid h-11 w-11 place-items-center rounded-full bg-(--accent) text-(--accent-ink)"
        >
          <Menu size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/* Mobile bottom tab bar — the 5 primary destinations */
/* -------------------------------------------------------------------------- */

function MobileTabBar({ focusMode }: { focusMode: boolean }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const due = useDueCount(pathname)

  return (
    <nav
      aria-label="Primary"
      inert={focusMode}
      aria-hidden={focusMode}
      className={cx(
        'glass-nav fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-40 flex items-center rounded-3xl border border-(--glass-border) px-1 py-1.5 lg:hidden',
        focusMode &&
          'pointer-events-none translate-y-full opacity-0',
      )}
    >
      {MOBILE_TABS.map((item) => (
        <MobileTab key={item.to} item={item} badge={item.to === '/review' ? due : null} />
      ))}
    </nav>
  )
}

function MobileTab({ item, badge }: { item: NavItem; badge: number | null }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-(--ink-soft)"
      activeProps={{
        className:
          'relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl bg-(--accent-soft) px-1 py-1.5 text-(--ink)',
        'aria-current': 'page',
      }}
    >
      <Icon size={20} aria-hidden="true" />

      <span className="text-[10px] font-semibold leading-none">
        {item.label}
      </span>

      {typeof badge === 'number' && badge > 0 && (
        <span className="absolute right-1/2 top-0.5 translate-x-4 rounded-full bg-(--accent) px-1.5 py-px font-mono text-[10px] font-semibold tabular-nums text-(--accent-ink)">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Mobile drawer — full navigation */
/* -------------------------------------------------------------------------- */

function MobileDrawer({
  onClose,
}: {
  onClose: () => void
}) {
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    return () => {
      const restore = restoreRef.current
      if (restore && document.contains(restore)) restore.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

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
          <span className="eyebrow">
            Navigation
          </span>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="glass-pill grid h-11 w-11 place-items-center"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Sidebar navigation"
          className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4"
        >
          <SidebarNav onNavigate={onClose} />

          <div className="mt-1">
            <AboutNavEntry onNavigate={onClose} />
          </div>
        </nav>

        <div className="flex shrink-0 items-center justify-between border-t border-sidebar-border p-4">
          <span className="text-sm font-medium text-(--ink-soft)">Theme</span>
          <ThemeToggle />
        </div>
      </aside>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Desktop sidebar */
/* -------------------------------------------------------------------------- */

function usePersistentBoolean(key: string, initial: boolean): readonly [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(initial)
  const hydrated = useRef(false)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) setValue(stored === '1')
    } catch {}
    hydrated.current = true
  }, [key])
  useEffect(() => {
    if (!hydrated.current) return
    try {
      window.localStorage.setItem(key, value ? '1' : '0')
    } catch {}
  }, [key, value])
  return [value, setValue] as const
}

function DesktopSidebar({
  focusMode,
  pathname,
}: {
  focusMode: boolean
  pathname: string
}) {
  const [collapsed, setCollapsed] = usePersistentBoolean('app-sidebar:collapsed', false)
  const due = useDueCount(pathname)

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <aside
      style={{ width: collapsed ? '76px' : '248px' }}
      className={cx(
        'sidebar-shell fixed bottom-5 left-5 top-5 z-50 hidden lg:flex flex-col overflow-hidden rounded-[28px]',
        focusMode && 'focus-sidebar',
      )}
    >
      <div className="flex min-h-0 w-full flex-col">
        <div className={cx('flex h-14 shrink-0 items-center border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'gap-2.5 px-4')}>
          <Link to="/" className={cx('flex items-center no-underline', collapsed ? 'justify-center' : 'min-w-0 flex-1 gap-2.5')} aria-label="Luminoesis home">
            <BrandMark size={34} />
            {!collapsed && (
              <span translate="no" className="display truncate text-[19px] font-semibold tracking-tight">Luminoesis</span>
            )}
          </Link>
        </div>

        <nav
          aria-label="Primary"
          className={cx('sidebar-scroll min-h-0 flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}
        >
          <SidebarNav collapsed={collapsed} dueCount={due} />
        </nav>

        <div className={cx('shrink-0 border-t border-sidebar-border p-3', collapsed ? 'flex flex-col items-center gap-1.5' : 'space-y-2')}>
          <AboutNavEntry collapsed={collapsed} />

          {!collapsed && (
            <p className="flex items-center gap-2 rounded-[14px] bg-(--surface-muted)/60 px-3 py-2.5 text-[13px] text-(--ink-soft)">
              <span className="pulse-dot" aria-hidden="true" />
              On-device only
            </p>
          )}
          {collapsed && (
            <span className="grid h-11 w-11 place-items-center" aria-hidden="true">
              <span className="pulse-dot" />
            </span>
          )}

          <div className={cx('flex items-center gap-1.5', collapsed && 'flex-col')}>
            <ThemeSwitch collapsed={collapsed} />

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-(--ink-soft) transition-colors hover:bg-(--surface-muted) hover:text-(--ink)"
            >
              {collapsed ? (
                <PanelLeftOpen size={17} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={17} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* -------------------------------------------------------------------------- */
/* Shared navigation */
/* -------------------------------------------------------------------------- */

type SidebarNavProps = {
  onNavigate?: () => void
  collapsed?: boolean
  dueCount?: number | null
}

function SidebarNav({
  onNavigate,
  collapsed = false,
  dueCount = null,
}: SidebarNavProps) {
  return (
    <div className="space-y-1">
      <NavSection
        items={[...PRIMARY_NAV_ITEMS, ...SYSTEM_NAV_ITEMS]}
        onNavigate={onNavigate}
        collapsed={collapsed}
        dueCount={dueCount}
      />
    </div>
  )
}

type NavSectionProps = {
  items: NavItem[]
  onNavigate?: () => void
  collapsed?: boolean
  dueCount?: number | null
}

function NavSection({
  items,
  onNavigate,
  collapsed = false,
  dueCount = null,
}: NavSectionProps) {
  return (
    <div className={cx('flex flex-col gap-1', collapsed && 'items-center')}>
      {items.map((item) => (
        <SidebarNavLink
          key={item.to}
          item={item}
          badge={item.to === '/review' ? dueCount : null}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      ))}
    </div>
  )
}

type SidebarNavLinkProps = {
  item: NavItem
  badge: number | null
  onNavigate?: () => void
  collapsed?: boolean
}

function SidebarNavLink({
  item,
  badge,
  onNavigate,
  collapsed = false,
}: SidebarNavLinkProps) {
  const Icon = item.icon

  if (collapsed) {
    return (
      <Link
        to={item.to}
        onClick={onNavigate}
        aria-label={item.label}
        title={item.label}
        className="sidebar-link grid h-11 w-11 place-items-center"
        activeProps={{
          className: 'sidebar-link is-active grid h-11 w-11 place-items-center',
          'aria-current': 'page',
        } as unknown as Record<string, unknown>}
      >
        <Icon size={19} aria-hidden="true" />
      </Link>
    )
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="sidebar-link"
      activeProps={{
        className: 'sidebar-link is-active',
        'aria-current': 'page',
      }}
    >
      <Icon size={19} aria-hidden="true" />

      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
        {item.label}
      </span>

      {typeof badge === 'number' && badge > 0 && (
        <span className="shrink-0 rounded-full bg-(--accent) px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-(--accent-ink)">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* About — footer entry navigating to the dedicated About page */
/* -------------------------------------------------------------------------- */

function AboutNavEntry({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void
  collapsed?: boolean
}) {
  if (collapsed) {
    return (
      <Link
        to="/about"
        onClick={onNavigate}
        aria-label="About"
        title="About"
        className="sidebar-link grid h-11 w-11 place-items-center"
        activeProps={{
          className: 'sidebar-link is-active grid h-11 w-11 place-items-center',
          'aria-current': 'page',
        } as unknown as Record<string, unknown>}
      >
        <Landmark size={19} aria-hidden="true" />
      </Link>
    )
  }

  return (
    <Link
      to="/about"
      onClick={onNavigate}
      className="sidebar-link"
      activeProps={{
        className: 'sidebar-link is-active',
        'aria-current': 'page',
      }}
    >
      <Landmark size={19} aria-hidden="true" />

      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
        About
      </span>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Theme — balanced utility switch (mockup v5 footer) */
/* -------------------------------------------------------------------------- */

function ThemeSwitch({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (collapsed) {
    const Icon = isDark ? Sun : Moon
    return (
      <button
        type="button"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggleTheme}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-(--ink-soft) transition-colors hover:bg-(--surface-muted) hover:text-(--ink)"
      >
        <Icon size={17} aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Dark mode on. Switch to light mode' : 'Dark mode off. Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className="relative grid h-11 min-h-11 flex-1 grid-cols-2 place-items-center rounded-[14px] border border-(--line) bg-(--surface-muted)/60 px-1"
    >
      <span
        aria-hidden="true"
        data-dark={isDark}
        className="pointer-events-none absolute left-1 top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-[10px] bg-(--surface) shadow-sm transition-transform duration-200 data-[dark=true]:translate-x-full"
      />
      <Moon size={16} aria-hidden="true" className="relative z-10 text-(--ink-soft)" />
      <Sun size={16} aria-hidden="true" className="relative z-10 text-(--ink-soft)" />
    </button>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const Icon = isDark ? Sun : Moon

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className="icon-btn shrink-0"
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Brand */
/* -------------------------------------------------------------------------- */

function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-[#0b0724] shadow-sm"
    >
      <img
        src="/assets/LumiNoesis.png"
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
        className="block"
        fetchPriority="high"
      />
    </span>
  )
}
