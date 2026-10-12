import { db } from '#/shared/lib/db/dexie'

export const SETTINGS_KEYS = {
  adaptiveOptIn: 'adaptiveOptIn',
  calibrationSessions: 'calibrationSessions',
  hasSeenOnboarding: 'hasSeenOnboarding',
  localModelTier: 'localModelTier',
  tutorEscalation: 'tutorEscalation',
} as const

export async function getSetting<T>(
  key: string,
  fallback: T,
): Promise<T> {
  const row = await db.appSettings.get(key)

  if (!row) {
    return fallback
  }

  try {
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}

export async function setSetting<T>(
  key: string,
  value: T,
): Promise<void> {
  await db.appSettings.put({
    key,
    value: JSON.stringify(value),
  })
}