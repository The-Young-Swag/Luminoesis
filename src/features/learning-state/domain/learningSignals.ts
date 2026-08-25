export type FeatureName =
  | 'interKeyLatency'
  | 'dwellTime'
  | 'correctionRate'
  | 'wpm'

export type BaselineFeature = {
  name: FeatureName
  mean: number
  variance: number
  stddev: number
  sampleCount: number
  lastUpdated: string
}

export type SessionSignal = {
  id: string
  sessionId: string
  minuteIndex: number
  timestamp: string
  interKeyLatency: number
  dwellTime: number
  correctionRate: number
  wpm: number
  zScores?: Record<FeatureName, number>
}