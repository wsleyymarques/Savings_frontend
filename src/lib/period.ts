import { addMonths, endOfMonth, formatMonthLabel, startOfMonth, type CivilDate } from './date'
import type { Period } from '../data/selectors'

export type PeriodPreset = 'mes-atual' | 'mes-anterior' | 'tudo' | 'personalizado'

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'mes-atual', label: 'Mês atual' },
  { value: 'mes-anterior', label: 'Mês anterior' },
  { value: 'tudo', label: 'Todo o histórico' },
  { value: 'personalizado', label: 'Período personalizado' },
]

/** Abre no mês atual, conforme o período inicial do SDD (5.4). */
export const DEFAULT_PERIOD_PRESET: PeriodPreset = 'mes-atual'

export function buildPeriod(
  preset: PeriodPreset,
  today: CivilDate,
  custom?: { start: CivilDate; end: CivilDate },
): Period {
  switch (preset) {
    case 'mes-atual':
      return { start: startOfMonth(today), end: endOfMonth(today), label: formatMonthLabel(today) }
    case 'mes-anterior': {
      const previous = addMonths(startOfMonth(today), -1)
      return { start: startOfMonth(previous), end: endOfMonth(previous), label: formatMonthLabel(previous) }
    }
    case 'tudo':
      return { start: '0001-01-01', end: '9999-12-31', label: 'Todo o histórico' }
    case 'personalizado': {
      const start = custom?.start || startOfMonth(today)
      const end = custom?.end || endOfMonth(today)
      return { start, end, label: 'Período personalizado' }
    }
  }
}
