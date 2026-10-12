export default function Footer() {
  return (
    <footer className="border-t border-(--line) py-6">
      <div className="page-wrap flex flex-col gap-2 text-xs text-(--ink-faint) sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
        <p className="m-0 min-w-0">
          Luminoesis — offline-first, on-device, timing-only.
          No key content ever captured.
        </p>

        <p className="kicker m-0 min-w-0">
          Built with TanStack Start · Dexie · Express · TanStack Charts
        </p>
      </div>
    </footer>
  )
}