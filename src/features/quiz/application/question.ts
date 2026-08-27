import { z } from 'zod'

import type { Question, QuestionType } from '#/features/quiz/domain/question'
import { questionRepository } from '#/features/quiz/repositories/questionRepository'

const QuestionTypeSchema = z.enum([
  'multiple-choice',
  'true-false',
  'short-answer',
])

const CreateQuestionSchema = z
  .object({
    conceptId: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
    type: QuestionTypeSchema,
    choices: z.array(z.string().trim().min(1)).optional(),
    answer: z.string().trim().min(1),
    explanation: z.string().trim().min(1).optional(),
    materialId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.type === 'multiple-choice' || value.type === 'true-false') &&
      (!value.choices || value.choices.length < 2)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['choices'],
        message: 'Provide at least two choices for this question type.',
      })
    }
    if (
      value.type === 'multiple-choice' &&
      value.choices &&
      !value.choices.includes(value.answer)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answer'],
        message: 'The answer must be one of the choices.',
      })
    }
  })

export type CreateQuestionInput = z.input<typeof CreateQuestionSchema>

export async function createQuestion(
  input: CreateQuestionInput,
): Promise<Question> {
  const data = CreateQuestionSchema.parse(input)
  return questionRepository.create(data)
}

const UpdateQuestionSchema = z
  .object({
    conceptId: z.string().trim().min(1).optional(),
    prompt: z.string().trim().min(1).optional(),
    type: QuestionTypeSchema.optional(),
    choices: z.array(z.string().trim().min(1)).optional(),
    answer: z.string().trim().min(1).optional(),
    explanation: z.string().trim().min(1).optional(),
    materialId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.type === 'multiple-choice' &&
      value.choices &&
      value.answer &&
      !value.choices.includes(value.answer)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answer'],
        message: 'The answer must be one of the choices.',
      })
    }
  })

export type UpdateQuestionInput = z.input<typeof UpdateQuestionSchema>

export async function updateQuestion(
  id: string,
  input: UpdateQuestionInput,
): Promise<Question> {
  const data = UpdateQuestionSchema.parse(input)
  await questionRepository.update(id, data)
  const updated = await questionRepository.findById(id)
  if (!updated) {
    throw new Error('Question not found after update.')
  }
  return updated
}

export async function deleteQuestion(id: string): Promise<void> {
  await questionRepository.delete(id)
}

export type { QuestionType }
