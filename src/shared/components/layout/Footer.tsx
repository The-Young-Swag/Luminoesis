export default function Footer() {
  return (
    <footer className="mt-16 border-t border-(--line) py-8">
      <div className="page-wrap flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-(--ink-faint)">
        <p className="m-0">
          Luminoesis — offline-first, on-device, timing-only. No key content ever
          captured.
        </p>
        <p className="kicker m-0">
          Built with TanStack Start · Dexie · Express · TanStack Charts
        </p>
      </div>
    </footer>
  )
}
