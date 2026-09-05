import { FIXTURE_TODAY } from '../data/seed'
import { usingMockApi } from '../services'
import { toCivilDate, type CivilDate } from './date'

/**
 * Data civil de referência da aplicação.
 *
 * Com o adaptador mockado, usa o relógio determinístico da fixture (design.md,
 * seção 8: posição em 10/10/2026). Com o backend real, usa a data local.
 */
export function today(): CivilDate {
  if (usingMockApi) return FIXTURE_TODAY
  const now = new Date()
  return toCivilDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}
