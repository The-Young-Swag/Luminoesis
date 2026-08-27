export function createQuizQuestionId(): string {
  return crypto.randomUUID()
}

export function createQuizAttemptId(): string {
  return crypto.randomUUID()
}
