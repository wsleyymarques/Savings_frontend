import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/States'
import { useDrawer } from '../../app/contexts'
import { QueryBoundary } from '../shared/QueryBoundary'
import {
  useArchiveHabitMutation,
  useHabitRangeQuery,
  useHabitsQuery,
} from '../../services/queries'
import { today } from '../../lib/today'
import type { HabitDay, HabitDefinition } from '../../services'
import { HABIT_MEASUREMENT_LABEL, formatMinutes } from './habitFormat'

export function RoutinePage() {
  const drawer = useDrawer()
  const habits = useHabitsQuery()
  const week = currentWeek(today())
  const weekDays = useHabitRangeQuery(week[0], week[week.length - 1])

  return (
    <>
      <PageHeader
        title="Rotina"
        description="Hábitos reutilizáveis e planejamento dos próximos dias."
        actions={<Button variant="primary" icon="plus" onClick={() => drawer.open({ kind: 'habito' })}>Novo hábito</Button>}
      />
      <div className="stack">
        <SurfaceCard
          title="Esta semana"
          description="Use o + de cada dia para planejar um hábito já parametrizado."
        >
          <QueryBoundary query={weekDays} rows={2}>
            {(days) => (
              <div className="habit-week-grid">
                {days.map((day) => (
                  <div className="habit-day-card" key={day.date}>
                    <div className="habit-day-card__header">
                      <div className="habit-day-card__date">
                        <span className="caption text-muted">
                          {new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                        <strong>{day.date.slice(8, 10)}/{day.date.slice(5, 7)}</strong>
                      </div>
                      <IconButton
                        className="habit-day-add"
                        icon="plus"
                        label={`Adicionar atividade em ${day.date.split('-').reverse().join('/')}`}
                        outlined
                        onClick={() => drawer.open({ kind: 'item-habito', date: day.date, preferExisting: true })}
                      />
                    </div>
                    {day.items.length === 0 ? (
                      <span className="habit-day-card__empty">Nenhuma atividade</span>
                    ) : (
                      <ul className="habit-day-items">
                        {day.items.map((item) => (
                          <li className={item.completed ? 'habit-day-item habit-day-item--done' : 'habit-day-item'} key={item.id}>
                            <span aria-hidden="true">{item.completed ? '✓' : '○'}</span>
                            <span>{item.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="caption text-muted">{day.completed}/{day.planned} concluídas</span>
                  </div>
                ))}
              </div>
            )}
          </QueryBoundary>
        </SurfaceCard>
        <SurfaceCard title="Meus hábitos" description="Acompanhe a frequência semanal e preserve o histórico ao arquivar.">
          <QueryBoundary query={habits} rows={3}>
            {(items) => items.length === 0 ? (
              <EmptyState
                title="Nenhum hábito criado"
                description="Crie Academia, Estudar ou qualquer prática que queira acompanhar."
                action={<Button icon="plus" onClick={() => drawer.open({ kind: 'habito' })}>Criar primeiro hábito</Button>}
              />
            ) : (
              <QueryBoundary query={weekDays} rows={3}>
                {(days) => <ul className="item-list">{items.map((habit) => <HabitRow key={habit.id} habit={habit} days={days} />)}</ul>}
              </QueryBoundary>
            )}
          </QueryBoundary>
        </SurfaceCard>
      </div>
    </>
  )
}

function HabitRow({ habit, days }: { habit: HabitDefinition; days: HabitDay[] }) {
  const drawer = useDrawer()
  const archive = useArchiveHabitMutation()
  const target = habit.measurementType === 'duracao'
    ? formatMinutes(habit.defaultDailyTarget)
    : habit.measurementType === 'check'
      ? 'concluir'
      : `${habit.defaultDailyTarget} ${habit.unit ?? ''}`
  const completedDays = new Set(
    days.flatMap((day) => day.items)
      .filter((item) => item.habitId === habit.id && item.completed)
      .map((item) => item.plannedOn),
  ).size

  return (
    <li className="item-row">
      <span className="habit-color" style={{ background: habit.color ?? 'var(--color-action)' }} />
      <div className="item-row__main">
        <span className="item-row__title">{habit.name}</span>
        <span className="item-row__meta">
          {HABIT_MEASUREMENT_LABEL[habit.measurementType]} · {habit.weeklyTarget}x por semana · objetivo por execução: {target}
        </span>
      </div>
      <Badge tone={completedDays >= habit.weeklyTarget ? 'success' : 'info'}>
        {completedDays}/{habit.weeklyTarget} na semana
      </Badge>
      <div className="item-row__actions">
        <Button variant="ghost" onClick={() => drawer.open({ kind: 'habito', id: habit.id })}>Editar</Button>
        <Button
          variant="ghost"
          disabled={archive.isPending}
          onClick={() => void archive.mutateAsync({
            id: habit.id,
            input: {
              name: habit.name,
              description: habit.description,
              color: habit.color,
              measurementType: habit.measurementType,
              unit: habit.unit,
              defaultDailyTarget: habit.defaultDailyTarget,
              weeklyTarget: habit.weeklyTarget,
            },
          })}
        >
          Arquivar
        </Button>
      </div>
    </li>
  )
}

function currentWeek(reference: string): string[] {
  const date = new Date(`${reference}T00:00:00Z`)
  const isoWeekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - isoWeekday + 1)
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(date)
    next.setUTCDate(next.getUTCDate() + index)
    return next.toISOString().slice(0, 10)
  })
}
