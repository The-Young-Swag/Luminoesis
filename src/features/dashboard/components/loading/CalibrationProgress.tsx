const CALIBRATION_TARGET = 5

export function CalibrationProgress({ progress }: { progress: number }) {
  const percentComplete = (progress / CALIBRATION_TARGET) * 100

  return (
    <section className="rounded-2xl border border-(--veridian)/20 bg-(--veridian-muted) p-4">
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-(--veridian) font-mono text-xs text-white shadow-[0_0_20px_-4px_var(--veridian)]">
          {progress}/{CALIBRATION_TARGET}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">Learning your rhythm</p>
            <span className="chip chip-live">{progress} / {CALIBRATION_TARGET}</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--surface-muted)">
            <div
              className="h-full rounded-full bg-linear-to-r from-(--veridian) to-(--blue) transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
