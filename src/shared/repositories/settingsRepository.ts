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

  getAllSettings() {
    return db.appSettings.toArray()
  },

  clear(): Promise<void> {
    return db.appSettings.clear()
  },
}