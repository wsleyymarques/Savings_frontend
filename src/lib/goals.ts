import type { CivilDate } from './date'

/**
 * Regras de atingimento e margem de erro do app Metas, iguais às do backend.
 * Ficam aqui para o adaptador mockado e as páginas usarem o mesmo cálculo.
 */

export type GoalMetricType = 'conclusao' | 'contagem' | 'valor' | 'percentual'
export type GoalDirection = 'aumentar' | 'reduzir'

export interface Measurable {
  metricType: GoalMetricType
  direction: GoalDirection
  baselineValue: number
  targetValue: number
  currentValue: number
  weight: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value > 1 ? 1 : value
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Fração percorrida entre a linha de base e o alvo, de 0 a 1. */
export function attainmentOf(item: Measurable): number {
  if (item.metricType === 'conclusao') return item.currentValue >= 1 ? 1 : 0

  const span =
    item.direction === 'reduzir'
      ? item.baselineValue - item.targetValue
      : item.targetValue - item.baselineValue
  if (span === 0) return 0

  const walked =
    item.direction === 'reduzir'
      ? item.baselineValue - item.currentValue
      : item.currentValue - item.baselineValue

  return clamp01(walked / span)
}

/** Distância do alvo em pontos percentuais. */
export function errorPercentOf(item: Measurable): number {
  return round((1 - attainmentOf(item)) * 100, 2)
}

function daysBetween(start: CivilDate, end: CivilDate): number {
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${end}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}

export function elapsedFraction(start: CivilDate, end: CivilDate, reference: CivilDate): number {
  const total = daysBetween(start, end) + 1
  if (total <= 0) return 1
  return clamp01((daysBetween(start, reference) + 1) / total)
}

export interface GoalMarginSummary {
  realErrorMargin: number
  projectedErrorMargin: number
  deviation: number
  withinMargin: boolean
  elapsedFraction: number
  objectiveCount: number
}

/**
 * Margem real: média dos erros ponderada pelo peso. Margem projetada: mesma
 * média comparando o atingimento com o ritmo esperado até a data de referência.
 */
export function summarize(
  cycle: { startDate: CivilDate; endDate: CivilDate; expectedErrorMargin: number },
  objectives: Measurable[],
  reference: CivilDate,
): GoalMarginSummary {
  const elapsed = elapsedFraction(cycle.startDate, cycle.endDate, reference)

  let weightTotal = 0
  let errorTotal = 0
  let paceWeightTotal = 0
  let paceErrorTotal = 0

  for (const objective of objectives) {
    const attainment = attainmentOf(objective)
    weightTotal += objective.weight
    errorTotal += (1 - attainment) * 100 * objective.weight

    // Conclusão não tem ritmo: só entra na projeção depois de concluída.
    if (objective.metricType === 'conclusao' && attainment < 1) continue
    if (elapsed === 0) continue

    paceWeightTotal += objective.weight
    paceErrorTotal += clamp01((elapsed - attainment) / elapsed) * 100 * objective.weight
  }

  const real = weightTotal === 0 ? 0 : round(errorTotal / weightTotal, 2)
  const projected = paceWeightTotal === 0 ? 0 : round(paceErrorTotal / paceWeightTotal, 2)

  return {
    realErrorMargin: real,
    projectedErrorMargin: projected,
    deviation: round(real - cycle.expectedErrorMargin, 2),
    withinMargin: real <= cycle.expectedErrorMargin,
    elapsedFraction: round(elapsed, 4),
    objectiveCount: objectives.length,
  }
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals).replace('.', ',')}%`
}

/** Valores de objetivo não são dinheiro: exibem no máximo duas casas. */
export function formatGoalValue(value: number, unit: string | null): string {
  const text = Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace('.', ',')
  return unit ? `${text} ${unit}` : text
}

export const METRIC_LABEL: Record<GoalMetricType, string> = {
  conclusao: 'Conclusão',
  contagem: 'Contagem',
  valor: 'Valor',
  percentual: 'Percentual',
}

export type NumberParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: string }

/** Aceita vírgula ou ponto e recusa texto livre, como os campos de dinheiro. */
export function parseDecimalInput(
  raw: string,
  options: { min?: number; max?: number; label?: string } = {},
): NumberParseResult {
  const label = options.label ?? 'valor'
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return { ok: false, reason: `Informe o ${label}.` }
  if (!/^-?\d{1,12}(\.\d{1,2})?$/.test(normalized)) {
    return { ok: false, reason: `Use um número com até duas casas decimais.` }
  }
  const value = Number(normalized)
  if (options.min !== undefined && value < options.min) {
    return { ok: false, reason: `O ${label} não pode ser menor que ${options.min}.` }
  }
  if (options.max !== undefined && value > options.max) {
    return { ok: false, reason: `O ${label} não pode ser maior que ${options.max}.` }
  }
  return { ok: true, value }
}

export function formatDecimalInput(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',')
}
