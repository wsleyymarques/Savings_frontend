import type { HabitDailyItem, HabitMeasurementType } from '../../services'

export const HABIT_MEASUREMENT_LABEL: Record<HabitMeasurementType, string> = {
  check: 'Feito ou não feito',
  contagem: 'Quantidade',
  duracao: 'Duração',
}

export function formatMinutes(total: number): string {
  const rounded = Math.round(total)
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60
  if (!hours) return `${minutes}min`
  return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`
}

export function formatHabitProgress(item: HabitDailyItem): string {
  if (item.measurementType === 'check') return item.completed ? 'Concluído' : 'Pendente'
  if (item.measurementType === 'duracao') {
    return `${formatMinutes(item.currentValue)} de ${formatMinutes(item.targetValue)}`
  }
  return `${item.currentValue.toLocaleString('pt-BR')} de ${item.targetValue.toLocaleString('pt-BR')} ${item.unit ?? ''}`.trim()
}
