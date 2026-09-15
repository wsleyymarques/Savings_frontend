import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { DateField } from '../../components/ui/Field'
import { today } from '../../lib/today'
import { QueryBoundary } from '../shared/QueryBoundary'
import { useHabitStatsQuery } from '../../services/queries'
import { formatMinutes } from './habitFormat'

export function HabitStatsPage() {
  const current = today()
  const [from, setFrom] = useState(`${current.slice(0, 8)}01`)
  const [to, setTo] = useState(current)
  const stats = useHabitStatsQuery(from, to)
  return (
    <>
      <PageHeader title="Estatísticas" description="Consistência, frequência e tempo investido na sua rotina." />
      <div className="period-fields"><DateField label="De" value={from} onChange={setFrom} /><DateField label="Até" value={to} onChange={setTo} /></div>
      <QueryBoundary query={stats} rows={4}>
        {(value) => <div className="stack"><div className="grid grid--stats"><div className="stat stat--highlight"><span className="stat__label">Aderência</span><span className="stat__value">{Math.round(value.adherence)}%</span><span className="stat__caption">{value.completed} de {value.planned} itens</span></div><div className="stat"><span className="stat__label">Dias ativos</span><span className="stat__value">{value.activeDays}</span><span className="stat__caption">Dias com execução registrada</span></div><div className="stat"><span className="stat__label">Tempo investido</span><span className="stat__value stat__value--compact">{formatMinutes(value.durationMinutes)}</span><span className="stat__caption">Atividades de duração</span></div></div><SurfaceCard title="Por hábito" description="Resultado do período selecionado.">{value.habits.length === 0 ? <p className="text-secondary">Ainda não há registros neste período.</p> : <div className="table-scroll"><table className="table"><thead><tr><th>Hábito</th><th>Concluído</th><th>Aderência</th><th>Dias ativos</th><th>Tempo</th></tr></thead><tbody>{value.habits.map((habit, index) => <tr key={habit.habitId ?? `${habit.name}-${index}`}><td>{habit.name}</td><td>{habit.completed}/{habit.planned}</td><td>{Math.round(habit.adherence)}%</td><td>{habit.activeDays}</td><td>{formatMinutes(habit.durationMinutes)}</td></tr>)}</tbody></table></div>}</SurfaceCard></div>}
      </QueryBoundary>
    </>
  )
}
