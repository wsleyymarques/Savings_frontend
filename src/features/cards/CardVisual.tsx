import { CARD_FUNCTION_LABEL, type CardFunction } from '../../data/types'

interface CardVisualProps {
  name: string
  accountName: string
  functions: CardFunction
  color: string
}

/**
 * Área de identidade do cartão. O texto fica sobre bloco sólido para preservar
 * contraste independentemente da cor escolhida. Nunca exibe número de cartão.
 */
export function CardVisual({ name, accountName, functions, color }: CardVisualProps) {
  return (
    <div className="card-visual" style={{ background: color }}>
      <span className="card-visual__chip" aria-hidden="true" />
      <div className="card-visual__text">
        <p className="card-visual__name">{name}</p>
        <p className="card-visual__meta">
          {accountName} · {CARD_FUNCTION_LABEL[functions]}
        </p>
      </div>
    </div>
  )
}
