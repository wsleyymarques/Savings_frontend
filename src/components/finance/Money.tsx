import { formatMoney, formatSignedMoney, type Cents } from '../../lib/money'

interface MoneyProps {
  value: Cents
  /** Mostra o sinal e aplica a cor de receita/despesa. */
  signed?: boolean
  className?: string
}

export function Money({ value, signed = false, className }: MoneyProps) {
  const tone = signed ? (value < 0 ? 'amount-negative' : value > 0 ? 'amount-positive' : '') : ''
  return (
    <span className={['money', tone, className ?? ''].filter(Boolean).join(' ')}>
      {signed ? formatSignedMoney(value) : formatMoney(value)}
    </span>
  )
}
