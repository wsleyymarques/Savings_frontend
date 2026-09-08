import type { BadgeTone } from '../../components/ui/Badge'
import type { GoalCycleStatus, GoalObjectiveStatus } from '../../services'

export const CYCLE_STATUS_LABEL: Record<GoalCycleStatus, string> = {
  planejado: 'Planejado',
  ativo: 'Ativo',
  encerrado: 'Encerrado',
}

export const OBJECTIVE_STATUS_LABEL: Record<GoalObjectiveStatus, string> = {
  ativo: 'Em andamento',
  alcancado: 'Alcançado',
  abandonado: 'Abandonado',
}

/** Verde dentro da margem, vermelho fora; ciclo sem objetivos fica neutro. */
export function marginTone(
  cycle: { expectedErrorMargin: number; objectiveCount: number },
  margin: number,
): BadgeTone {
  if (cycle.objectiveCount === 0) return 'neutral'
  return margin <= cycle.expectedErrorMargin ? 'success' : 'danger'
}
