import { db } from '#/shared/lib/db/dexie'
import {
  getSetting,
  setSetting,
  SETTINGS_KEYS,
} from '#/shared/lib/db/settings'

export const settingsRepository = {
  getAdaptiveOptIn(): Promise<boolean | null> {
    return getSetting<boolean | null>(
      SETTINGS_KEYS.adaptiveOptIn,
      null,
    )
  },

  setAdaptiveOptIn(
    value: boolean,
  ): Promise<void> {
    return setSetting(
      SETTINGS_KEYS.adaptiveOptIn,
      value,
    )
  },

  getLocalModelTier(): Promise<'standard' | 'capable'> {
    return getSetting<'standard' | 'capable'>(
      SETTINGS_KEYS.localModelTier,
      'standard',
    ).then((tier) => (tier === 'capable' ? 'capable' : 'standard'))
  },

  setLocalModelTier(
    value: 'standard' | 'capable',
  ): Promise<void> {
    return setSetting(
      SETTINGS_KEYS.localModelTier,
      value,
    )
  },

  getTutorEscalation(): Promise<boolean> {
    return getSetting<boolean>(
      SETTINGS_KEYS.tutorEscalation,
      false,
    )
  },

  setTutorEscalation(
    value: boolean,
  ): Promise<void> {
    return setSetting(
      SETTINGS_KEYS.tutorEscalation,
      value,
    )
  },

  getAllSettings() {
    return db.appSettings.toArray()
  },

  clear(): Promise<void> {
    return db.appSettings.clear()
  },
}