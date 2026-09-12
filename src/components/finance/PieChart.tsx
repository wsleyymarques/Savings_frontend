import { formatMoney } from '../../lib/money'
import type { BreakdownRow } from '../../data/selectors'
import { EmptyState } from '../ui/States'

interface PieChartProps {
  rows: BreakdownRow[]
  emptyMessage: string
  /** Rótulo acessível do gráfico e da tabela equivalente. */
  label: string
  /** Fatias exibidas antes de agrupar o restante em "Outros". */
  maxSlices?: number
}

/**
 * Rosca com a participação de cada fatia no total. O gráfico é decorativo: os
 * mesmos números aparecem na legenda, então quem não enxerga a imagem não perde
 * informação.
 */
export function PieChart({ rows, emptyMessage, label, maxSlices = 8 }: PieChartProps) {
  const positive = rows.filter((row) => row.amount > 0)
  const total = positive.reduce((sum, row) => sum + row.amount, 0)

  if (total <= 0) {
    return <EmptyState icon="filter" title={emptyMessage} />
  }

  const slices = groupTail(positive, maxSlices).map((row, index) => ({
    ...row,
    percent: (row.amount / total) * 100,
    color: SLICE_COLORS[index % SLICE_COLORS.length],
  }))

  // Um gradiente cônico posiciona cada fatia pela porcentagem acumulada.
  let cursor = 0
  const stops = slices.map((slice) => {
    const start = cursor
    cursor += slice.percent
    return `${slice.color} ${start}% ${cursor}%`
  })

  return (
    <div className="pie">
      <div
        className="pie__graphic"
        role="img"
        aria-label={`${label}: ${slices
          .map((slice) => `${slice.label} ${formatPercent(slice.percent)}`)
          .join(', ')}`}
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      >
        <div className="pie__hole">
          <span className="pie__hole-label">Total</span>
          <strong className="pie__hole-value">{formatMoney(total)}</strong>
        </div>
      </div>

      <ul className="pie__legend" aria-label={label}>
        {slices.map((slice) => (
          <li key={slice.key} className="pie__legend-row">
            <span className="pie__swatch" style={{ backgroundColor: slice.color }} aria-hidden="true" />
            <span className="pie__legend-label">{slice.label}</span>
            <span className="pie__legend-percent">{formatPercent(slice.percent)}</span>
            <span className="pie__legend-value">{formatMoney(slice.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Mantém as maiores fatias e soma o resto para a rosca continuar legível. */
function groupTail(rows: BreakdownRow[], maxSlices: number): BreakdownRow[] {
  const sorted = [...rows].sort((a, b) => b.amount - a.amount)
  if (sorted.length <= maxSlices) return sorted
  const head = sorted.slice(0, maxSlices - 1)
  const tail = sorted.slice(maxSlices - 1)
  return [
    ...head,
    {
      key: 'outros',
      label: `Outros (${tail.length})`,
      amount: tail.reduce((sum, row) => sum + row.amount, 0),
    },
  ]
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

const SLICE_COLORS = [
  '#6d5efc',
  '#22b8a6',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#a855f7',
  '#10b981',
  '#f97316',
]
