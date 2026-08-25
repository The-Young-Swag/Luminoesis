export type Insight = {
  id: string
  statement: string
  stat: string
  timestamp: string
  dismissed: boolean
  kind: 'retention' | 'focus' | 'peak' | 'general'
}