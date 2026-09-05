import { formatMoney } from '../../lib/money'
import type { BreakdownRow } from '../../data/selectors'
import { EmptyState } from '../ui/States'

interface BreakdownProps {
  rows: BreakdownRow[]
  emptyMessage: string
  /** Rótulo acessível da lista de barras. */
  label: string
}

/** Barras horizontais com valor sempre visível; o tooltip não é a única fonte. */
export function Breakdown({ rows, emptyMessage, label }: BreakdownProps) {
  if (rows.length === 0) {
    return <EmptyState icon="filter" title={emptyMessage} />
  }

  const max = Math.max(...rows.map((row) => row.amount), 1)

  return (
    <ul className="breakdown" aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className="breakdown__row">
          <div className="breakdown__head">
            <span className="breakdown__label">
              {row.label}
              {row.detail ? <span className="breakdown__detail"> · {row.detail}</span> : null}
            </span>
            <span className="breakdown__value">{formatMoney(row.amount)}</span>
          </div>
          <div className="breakdown__track">
            <div className="breakdown__fill" style={{ width: `${(row.amount / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
