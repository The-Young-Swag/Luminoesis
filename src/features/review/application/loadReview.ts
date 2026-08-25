import { seedIfEmpty } from '#/shared/lib/db/seed'
import { cardRepository } from '#/features/library/repositories/cardRepository'
import { getCalibrationSessions } from '#/features/review/repositories/calibrationRepository'

const MAX_CALIBRATION_SESSIONS = 5

export async function loadReview() {
  await seedIfEmpty()

  const [
    cards,
    adaptiveOptIn,
    calibrationSessions,
  ] = await Promise.all([
    cardRepository.findAll(),
    settingsRepository.getAdaptiveOptIn(),
    getCalibrationSessions(),
  ])

  return {
    cards,
    adaptiveOptIn: adaptiveOptIn ?? false,
    calibrationSessions: Math.min(
      calibrationSessions,
      MAX_CALIBRATION_SESSIONS,
    ),
  }
}
