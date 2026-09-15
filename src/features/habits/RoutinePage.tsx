import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/States'
import { useDrawer } from '../../app/contexts'
import { QueryBoundary } from '../shared/QueryBoundary'
import { useArchiveHabitMutation, useHabitsQuery } from '../../services/queries'
import { today } from '../../lib/today'
import type { HabitDefinition } from '../../services'
import { HABIT_MEASUREMENT_LABEL, formatMinutes } from './habitFormat'

export function RoutinePage() {
  const drawer = useDrawer()
  const habits = useHabitsQuery()
  const week = nextSevenDays(today())
  return (
    <>
      <PageHeader title="Rotina" description="Hábitos reutilizáveis e planejamento dos próximos dias." actions={<Button variant="primary" icon="plus" onClick={() => drawer.open({ kind: 'habito' })}>Novo hábito</Button>} />
      <div className="stack">
        <SurfaceCard title="Próximos 7 dias" description="Escolha atividades para cada dia; a meta continua avaliando o que foi realmente executado.">
          <div className="habit-week-grid">
            {week.map((date) => <div className="habit-day-card" key={date}><span className="caption text-muted">{new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })}</span><strong>{date.slice(8, 10)}/{date.slice(5, 7)}</strong><Button variant="ghost" icon="plus" onClick={() => drawer.open({ kind: 'item-habito', date })}>Planejar</Button></div>)}
          </div>
        </SurfaceCard>
        <SurfaceCard title="Meus hábitos" description="Use-os em qualquer dia e preserve o histórico ao arquivar.">
          <QueryBoundary query={habits} rows={3}>
            {(items) => items.length === 0 ? <EmptyState title="Nenhum hábito criado" description="Crie Academia, Estudar ou qualquer prática que queira acompanhar." action={<Button icon="plus" onClick={() => drawer.open({ kind: 'habito' })}>Criar primeiro hábito</Button>} /> : <ul className="item-list">{items.map((habit) => <HabitRow key={habit.id} habit={habit} />)}</ul>}
          </QueryBoundary>
        </SurfaceCard>
      </div>
    </>
  )
}

function HabitRow({ habit }: { habit: HabitDefinition }) {
  const drawer = useDrawer()
  const archive = useArchiveHabitMutation()
  const target = habit.measurementType === 'duracao' ? formatMinutes(habit.defaultDailyTarget) : habit.measurementType === 'check' ? '1 conclusão' : `${habit.defaultDailyTarget} ${habit.unit ?? ''}`
  return <li className="item-row"><span className="habit-color" style={{ background: habit.color ?? 'var(--color-action)' }} /><div className="item-row__main"><span className="item-row__title">{habit.name}</span><span className="item-row__meta">{HABIT_MEASUREMENT_LABEL[habit.measurementType]} · alvo {target}</span></div><Badge tone="info">Ativo</Badge><div className="item-row__actions"><Button variant="ghost" onClick={() => drawer.open({ kind: 'habito', id: habit.id })}>Editar</Button><Button variant="ghost" disabled={archive.isPending} onClick={() => void archive.mutateAsync({ id: habit.id, input: { name: habit.name, description: habit.description, color: habit.color, measurementType: habit.measurementType, unit: habit.unit, defaultDailyTarget: habit.defaultDailyTarget } })}>Arquivar</Button></div></li>
}

function nextSevenDays(start: string): string[] {
  const date = new Date(`${start}T00:00:00Z`)
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(date)
    next.setUTCDate(next.getUTCDate() + index)
    return next.toISOString().slice(0, 10)
  })
}
