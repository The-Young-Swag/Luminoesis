import { db } from '#/shared/lib/db/dexie'
import type { QuizAttempt } from '#/features/quiz/domain/quizAttempt'

export const quizAttemptRepository = {
  async save(attempt: QuizAttempt): Promise<void> {
    await db.quizAttempts.add(attempt)
  },

  async getByLearningSpace(learningSpaceId: string): Promise<QuizAttempt[]> {
    const attempts = await db.quizAttempts
      .where('learningSpaceId')
      .equals(learningSpaceId)
      .toArray()
    return attempts.sort((a, b) => b.completedAt - a.completedAt)
  },

  async getRecent(limit = 20): Promise<QuizAttempt[]> {
    const attempts = await db.quizAttempts.toArray()
    return attempts
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit)
  },
}
