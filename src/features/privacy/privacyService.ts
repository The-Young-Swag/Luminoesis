import type { BaselineFeature, SessionSignal } from '#/features/learning-state/domain/learningSignals'
import type { Card } from '#/features/library/domain/card'
import type { ReviewSession } from '#/features/review/domain/reviewSession'

  import { baselineRepository } from '#/features/learning-state/repositories/baselineRepository'
  import { cardRepository } from '#/features/library/repositories/cardRepository'
  import { sessionRepository } from '#/features/review/repositories/sessionRepository'
  import { settingsRepository } from '#/shared/repositories/settingsRepository'
  import { signalRepository } from '#/features/review/repositories/signalRepository'

  export type PrivacySignal = SessionSignal

  export type PrivacyData = {
    optIn: boolean | null
    signals: PrivacySignal[]
    baseline: BaselineFeature[]
  }

  export type PrivacyExport = {
    exportedAt: string
    cards: Card[]
    sessions: ReviewSession[]
    signalsAll: SessionSignal[]
    baseline: BaselineFeature[]
  }

  export async function loadPrivacyData(): Promise<PrivacyData> {
    const cutoff = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString()

    const [
      optIn,
      signals,
      baseline,
    ] = await Promise.all([
      settingsRepository.getAdaptiveOptIn(),
      signalRepository.findRecent(12),
      baselineRepository.findAll(),
    ])

    return {
      optIn,
      signals: signals.filter(
        (signal) => signal.timestamp > cutoff,
      ),
      baseline,
    }
  }

  export async function exportAllData(): Promise<PrivacyExport> {
    const [
      cards,
      sessions,
      signalsAll,
      baseline,
    ] = await Promise.all([
      cardRepository.findAll(),
      sessionRepository.findAll(),
      signalRepository.findAll(),
      baselineRepository.findAll(),
    ])

    return {
      exportedAt: new Date().toISOString(),
      cards,
      sessions,
      signalsAll,
      baseline,
    }
  }

  export async function exportCards(): Promise<Card[]> {
    return cardRepository.findAll()
  }

  export async function setAdaptiveOptIn(
    value: boolean,
  ): Promise<void> {
    await settingsRepository.setAdaptiveOptIn(value)
  }

  export async function deleteAllData(): Promise<void> {
    await Promise.all([
      cardRepository.clear(),
      sessionRepository.clear(),
      signalRepository.clear(),
      baselineRepository.clear(),
      settingsRepository.clear(),
    ])
  }
