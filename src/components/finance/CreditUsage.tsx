import { formatMoney, type Cents } from '../../lib/money'

interface CreditUsageProps {
  limit: Cents
  committed: Cents
}

/** Barra de utilização com legenda textual; nunca divide por zero. */
export function CreditUsage({ limit, committed }: CreditUsageProps) {
  const ratio = limit > 0 ? Math.min(1, committed / limit) : 0
  const available = Math.max(0, limit - committed)
  const label = `${formatMoney(committed)} de ${formatMoney(limit)} utilizados`

  return (
    <div className="usage">
      <div
        className="usage__track"
        role="img"
        aria-label={`${label}. Disponível ${formatMoney(available)}.`}
      >
        <div className="usage__fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="usage__legend">
        <span>{label}</span>
        <span className="money">Disponível {formatMoney(available)}</span>
      </div>
    </div>
  )
}
