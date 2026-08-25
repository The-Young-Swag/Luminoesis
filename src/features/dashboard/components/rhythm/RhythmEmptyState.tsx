export function RhythmEmptyState({ hasBaseline, signalCount }: { hasBaseline: boolean; signalCount: number }) {
  return (
    <div className="flex min-h-52 items-center rounded-2xl border border-(--line) bg-(--surface-muted) p-6">
      <div>
        <div className="text-sm font-medium">
          {hasBaseline ? 'Waiting for recent timing observations' : 'Learning your baseline'}
        </div>

        <div className="mt-1 text-xs leading-5 text-(--ink-faint)">
          {hasBaseline
            ? `${signalCount} timing observations available; more are needed for the recent rhythm view.`
            : 'Luminoesis will establish the reference from your actual sensed review sessions.'}
        </div>
      </div>
    </div>
  )
}
