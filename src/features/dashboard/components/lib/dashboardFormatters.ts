export function stateDot(state: string): string {
  switch (state) {
    case 'Sharp':
      return 'bg-(--emerald)'
    case 'Steady':
      return 'bg-(--veridian)'
    case 'Warming Down':
      return 'bg-(--warning)'
    case 'Recovering':
      return 'bg-(--racing)'
    default:
      return 'bg-(--ink-faint)'
  }
}

export function headlineForState(
  state: string,
  due: number,
  totalCards: number,
): string {
  if (totalCards === 0) {
    return 'Build your library to begin'
  }

  if (state === 'Sharp') {
    return 'You’re ready for more challenging material'
  }

  if (state === 'Warming Down') {
    return 'Familiar material may fit your current rhythm'
  }

  if (state === 'Recovering') {
    return 'Your rhythm is returning toward baseline'
  }

  if (state === 'Insufficient Signal') {
    return due > 0 ? 'A focused review is ready when you are' : 'You’re all caught up — ready when you are'
  }

  return due > 0 ? 'A focused review is ready when you are' : 'You’re all caught up'
}

export function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:00 ${suffix}`
}
