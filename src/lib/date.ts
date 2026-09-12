/**
 * Datas civis no formato ISO curto (AAAA-MM-DD), sem hora e sem fuso.
 * Nenhuma conversão via Date evita o deslocamento de um dia (design.md, DateInput).
 */
export type CivilDate = string

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function isValidCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (month < 1 || month > 12) return false
  const days = daysInMonth(year, month)
  return day >= 1 && day <= days
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function formatDate(value: CivilDate): string {
  if (!isValidCivilDate(value)) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export function formatMonthLabel(value: CivilDate): string {
  const [year, month] = value.split('-').map(Number)
  return `${MONTHS[month - 1]} de ${year}`
}

export function monthLabelFrom(year: number, month: number): string {
  return `${MONTHS[month - 1]} de ${year}`
}

export function startOfMonth(value: CivilDate): CivilDate {
  const [year, month] = value.split('-')
  return `${year}-${month}-01`
}

export function endOfMonth(value: CivilDate): CivilDate {
  const [year, month] = value.split('-').map(Number)
  return `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`
}

export function addMonths(value: CivilDate, delta: number): CivilDate {
  const [year, month, day] = value.split('-').map(Number)
  const total = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  const clampedDay = Math.min(day, daysInMonth(nextYear, nextMonth))
  return toCivilDate(nextYear, nextMonth, clampedDay)
}

export function toCivilDate(year: number, month: number, day: number): CivilDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Comparação lexicográfica é suficiente para AAAA-MM-DD. */
export function isBefore(a: CivilDate, b: CivilDate): boolean {
  return a < b
}

export function isWithin(value: CivilDate, start: CivilDate, end: CivilDate): boolean {
  return value >= start && value <= end
}

export function compareDateDesc(a: CivilDate, b: CivilDate): number {
  return a < b ? 1 : a > b ? -1 : 0
}

/**
 * Data e hora do cadastro no fuso do navegador. A API envia um instante ISO;
 * a listagem usa esse valor para desempatar lançamentos do mesmo dia.
 */
export function formatDateTime(value: string): string {
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return '—'
  return instant.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(value: string): string {
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return ''
  return instant.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
