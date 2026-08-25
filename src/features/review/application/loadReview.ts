import { seedIfEmpty } from '#/shared/lib/db/seed'
import { cardRepository } from '#/features/library/repositories/cardRepository'
import { settingsRepository } from '#/shared/repositories/settingsRepository'

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
    settingsRepository.getCalibrationSessions(),
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
