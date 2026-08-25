import { setCalibrationSessions } from '#/features/review/repositories/calibrationRepository'

const MAX_CALIBRATION_SESSIONS = 5

export async function completeCalibration(
  currentCount: number,
): Promise<number> {
  const nextCount = Math.min(
    Math.max(currentCount, 0) + 1,
    MAX_CALIBRATION_SESSIONS,
  )

  await setCalibrationSessions(
    nextCount,
  )

  return nextCount
}