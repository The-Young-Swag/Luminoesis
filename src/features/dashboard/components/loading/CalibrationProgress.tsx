const CALIBRATION_TARGET = 5

export function CalibrationProgress({
  progress,
}: {
  progress: number
}) {
  const safeProgress = Math.max(
    0,
    Math.min(progress, CALIBRATION_TARGET),
  )

  const percentComplete =
    (safeProgress / CALIBRATION_TARGET) * 100

  const isComplete =
    safeProgress >= CALIBRATION_TARGET

  return (
    <section className="card-flat p-4 text-(--ink)">
      <div className="flex items-center gap-4">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-(--veridian) font-mono text-xs text-white shadow-[0_0_20px_-4px_var(--veridian)]"
          aria-label={`${safeProgress} of ${CALIBRATION_TARGET} calibration sessions`}
        >
          {safeProgress}/{CALIBRATION_TARGET}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {isComplete
                  ? 'Your rhythm is calibrated'
                  : 'Learning your rhythm'}
              </p>

              <p className="mt-0.5 text-xs text-(--ink-faint)">
                {isComplete
                  ? 'Your personal baseline is ready.'
                  : 'Collecting timing observations for your personal baseline.'}
              </p>
            </div>

            <span className="chip chip-live shrink-0">
              {safeProgress} / {CALIBRATION_TARGET}
            </span>
          </div>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-(--surface-muted)"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={CALIBRATION_TARGET}
            aria-valuenow={safeProgress}
            aria-label="Calibration progress"
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-(--veridian) to-(--blue) transition-[width] duration-500"
              style={{
                width: `${percentComplete}%`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}