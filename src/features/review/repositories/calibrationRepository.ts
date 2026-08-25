import {
  getSetting,
  setSetting,
  SETTINGS_KEYS,
} from '#/shared/lib/db/settings'

export function getCalibrationSessions(): Promise<number> {
  return getSetting<number>(
    SETTINGS_KEYS.calibrationSessions,
    0,
  )
}

export function setCalibrationSessions(
  count: number,
): Promise<void> {
  return setSetting(
    SETTINGS_KEYS.calibrationSessions,
    count,
  )
}