import { getMetric, setMetric } from '#/features/dashboard/repositories/metricsRepository'

const METRIC_KEYS = {
  calibrationAttempts: 'metrics:calibrationAttempts',
  calibrationCompletions: 'metrics:calibrationCompletions',
  adaptiveOffers: 'metrics:adaptiveOffers',
  adaptiveDismissals: 'metrics:adaptiveDismissals',
  adaptiveOverrides: 'metrics:adaptiveOverrides',
} as const

type MetricKey =
  (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS]

async function incrementMetric(
  key: MetricKey,
): Promise<number> {
  const current =
    await getMetric(key)

  const next = current + 1

  await setMetric(key, next)

  return next
}

export async function trackCalibrationAttempt(): Promise<void> {
  await incrementMetric(
    METRIC_KEYS.calibrationAttempts,
  )
}

export async function trackCalibrationCompletion(): Promise<void> {
  await incrementMetric(
    METRIC_KEYS.calibrationCompletions,
  )
}

export async function trackAdaptiveOffer(): Promise<void> {
  await incrementMetric(
    METRIC_KEYS.adaptiveOffers,
  )
}

export async function trackAdaptiveDismiss(): Promise<void> {
  await incrementMetric(
    METRIC_KEYS.adaptiveDismissals,
  )
}

export async function trackAdaptiveOverride(): Promise<void> {
  await incrementMetric(
    METRIC_KEYS.adaptiveOverrides,
  )
}

export async function getMetrics() {
  const [
    attempts,
    completions,
    offers,
    dismissals,
    overrides,
  ] = await Promise.all([
    getMetric(
      METRIC_KEYS.calibrationAttempts,
    ),
    getMetric(
      METRIC_KEYS.calibrationCompletions,
    ),
    getMetric(
      METRIC_KEYS.adaptiveOffers,
    ),
    getMetric(
      METRIC_KEYS.adaptiveDismissals,
    ),
    getMetric(
      METRIC_KEYS.adaptiveOverrides,
    ),
  ])

  return {
    calibrationCompletionRate:
      attempts > 0
        ? completions / attempts
        : null,

    adaptiveDismissRate:
      offers > 0
        ? dismissals / offers
        : null,

    adaptiveOverrideRate:
      offers > 0
        ? overrides / offers
        : null,

    raw: {
      attempts,
      completions,
      offers,
      dismissals,
      overrides,
    },
  }
}