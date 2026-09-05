import type { ReactNode } from 'react'
import { formatMoney, type Cents } from '../../lib/money'

interface StatCardProps {
  label: string
  value: Cents
  caption?: ReactNode
  highlight?: boolean
  compact?: boolean
  /** Aplica cor de resultado positivo/negativo; zero permanece neutro. */
  signedTone?: boolean
}

export function StatCard({
  label,
  value,
  caption,
  highlight = false,
  compact = false,
  signedTone = false,
}: StatCardProps) {
  const tone = signedTone && value !== 0 ? (value > 0 ? 'amount-positive' : 'amount-negative') : ''
  return (
    <div className={['stat', highlight ? 'stat--highlight' : ''].filter(Boolean).join(' ')}>
      <p className="stat__label">{label}</p>
      <p className={['stat__value', compact ? 'stat__value--compact' : '', tone].filter(Boolean).join(' ')}>
        {formatMoney(value)}
      </p>
      {caption ? <p className="stat__caption">{caption}</p> : null}
    </div>
  )
}
