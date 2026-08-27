export function createFlashcardId(): string {
  return crypto.randomUUID()
}

export function createQuestionId(): string {
  return crypto.randomUUID()
}
