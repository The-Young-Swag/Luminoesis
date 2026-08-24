import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'flat' | 'glass'
}

export function Card({
  variant = 'flat',
  className = '',
  ...props
}: CardProps) {
  const base = variant === 'glass' ? 'card-glass' : 'card-flat'
  return <div className={`${base} ${className}`} {...props} />
}

export function CardHeader({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 ${className}`} {...props} />
}