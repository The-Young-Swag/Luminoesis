const SKELETON_STAT_COUNT = 4

export function DashboardSkeleton() {
  return (
    <div className="page-wrap space-y-6 py-6 md:py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your rhythm…</span>

      <div className="card-flat flex flex-col gap-4 p-5 md:flex-row md:items-center md:p-6">
        <div className="flex-1 space-y-3">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-7 w-2/3 max-w-md" />
          <div className="skeleton h-4 w-full max-w-sm" />
        </div>

        <div className="skeleton h-10 w-48 shrink-0 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: SKELETON_STAT_COUNT }).map((_, index) => (
          <div key={index} className="card-flat p-4">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton mt-3 h-6 w-12" />
            <div className="skeleton mt-2 h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <div className="card-flat p-5">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton mt-4 h-52 w-full rounded-xl" />
        </div>

        <div className="card-flat p-5">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton mt-5 h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
