export type Card = {
  id: string
  front: string
  back: string
  topic: string
  targetDate?: string
  createdAt: string
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: string
  lastReviewed?: string
}