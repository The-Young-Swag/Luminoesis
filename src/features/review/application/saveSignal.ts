import type { SessionSignal } from '#/features/learning-state/domain/learningSignals'

import { signalRepository } from '#/features/review/repositories/signalRepository'

export async function saveSignal(
  signal: SessionSignal,
): Promise<void> {
  await signalRepository.create(signal)
}