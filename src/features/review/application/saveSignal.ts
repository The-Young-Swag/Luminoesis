import type { SessionSignal } from '#/features/learning-state/domain/learningSignals'

import { signalRepository } from '#/shared/repositories/signalRepository'

export async function saveSignal(
  signal: SessionSignal,
): Promise<void> {
  await signalRepository.create(signal)
}