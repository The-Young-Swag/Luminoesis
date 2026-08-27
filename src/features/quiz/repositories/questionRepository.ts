import { db } from '#/shared/lib/db/dexie'
import type { Question, QuestionType } from '#/features/quiz/domain/question'

export type QuestionFilters = {
  conceptIds?: string[]
  materialId?: string
  type?: QuestionType
}

export const questionRepository = {
  async create(
    data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Question> {
    const now = Date.now()
    const question: Question = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    await db.questions.add(question)
    return question
  },

  async update(
    id: string,
    data: Partial<Omit<Question, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.questions.update(id, { ...data, updatedAt: Date.now() })
  },

  async delete(id: string): Promise<void> {
    await db.questions.delete(id)
  },

  async findById(id: string): Promise<Question | undefined> {
    return db.questions.get(id)
  },

  async getByConceptIds(conceptIds: string[]): Promise<Question[]> {
    if (conceptIds.length === 0) return []
    return db.questions.where('conceptId').anyOf(conceptIds).toArray()
  },

  async getByLearningSpace(
    conceptIds: string[],
    filters: QuestionFilters = {},
  ): Promise<Question[]> {
    const all = await this.getByConceptIds(conceptIds)
    return all.filter((question) => {
      if (filters.materialId && question.materialId !== filters.materialId) {
        return false
      }
      if (filters.type && question.type !== filters.type) return false
      return true
    })
  },
}
