import {
  getSetting,
  setSetting,
} from '#/shared/lib/db/settings'

export async function getMetric(
  key: string,
): Promise<number> {
  return getSetting<number>(key, 0)
}

export async function setMetric(
  key: string,
  value: number,
): Promise<void> {
  return setSetting(key, value)
}