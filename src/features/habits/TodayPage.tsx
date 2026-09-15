import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/States'
import { DateField } from '../../components/ui/Field'
import { useDrawer, useSession } from '../../app/contexts'
import { today } from '../../lib/today'
import { QueryBoundary } from '../shared/QueryBoundary'
import type { HabitDailyItem } from '../../services'
import {
  useDeleteHabitItemMutation,
  useDeleteHabitRecordMutation,
  useHabitDayQuery,
  useHabitItemStateMutation,
  useHabitRecordMutation,
} from '../../services/queries'
import { formatHabitProgress, formatMinutes } from './habitFormat'

export function TodayPage() {
  const [date, setDate] = useState(today())
  const { status } = useSession()
  const drawer = useDrawer()
  const day = useHabitDayQuery(date, status === 'authenticated')

  return (
    <>
      <PageHeader
        title={date === today() ? 'Hoje' : 'Checklist do dia'}
        description="Ações pequenas de hoje conectadas à rotina que você quer construir."
        actions={<Button variant="primary" icon="plus" onClick={() => drawer.open({ kind: 'item-habito', date })}>Adicionar atividade</Button>}
      />
      <div className="habit-date-filter">
        <DateField label="Dia" value={date} onChange={setDate} />
        {date !== today() ? <Button variant="ghost" onClick={() => setDate(today())}>Voltar para hoje</Button> : null}
      </div>
      <QueryBoundary query={day} rows={4}>
        {(value) => (
          <div className="stack">
            <div className="grid grid--stats">
              <div className="stat stat--highlight"><span className="stat__label">Progresso do dia</span><span className="stat__value">{Math.round(value.completionRate)}%</span><span className="stat__caption">{value.completed} de {value.planned} atividades</span></div>
              <div className="stat"><span className="stat__label">Tempo registrado</span><span className="stat__value stat__value--compact">{formatMinutes(value.items.filter((item) => item.measurementType === 'duracao').reduce((total, item) => total + item.currentValue, 0))}</span><span className="stat__caption">Soma das sessões deste dia</span></div>
            </div>
            <SurfaceCard title="Checklist" description="Marque checks ou registre quantidade e duração.">
              {value.items.length === 0 ? (
                <EmptyState title="Nada planejado para este dia" description="Adicione uma atividade avulsa ou use um hábito da sua rotina." action={<Button icon="plus" onClick={() => drawer.open({ kind: 'item-habito', date })}>Adicionar primeira atividade</Button>} />
              ) : <ul className="item-list">{value.items.map((item) => <HabitItemRow key={item.id} item={item} />)}</ul>}
            </SurfaceCard>
          </div>
        )}
      </QueryBoundary>
    </>
  )
}

function HabitItemRow({ item }: { item: HabitDailyItem }) {
  const drawer = useDrawer()
  const check = useHabitRecordMutation(item.id)
  const removeRecord = useDeleteHabitRecordMutation()
  const state = useHabitItemStateMutation()
  const removeItem = useDeleteHabitItemMutation()
  const busy = check.isPending || removeRecord.isPending || state.isPending || removeItem.isPending

  async function toggleCheck() {
    if (item.completed && item.records[0]) await removeRecord.mutateAsync(item.records[0].id)
    else await check.mutateAsync({ note: null })
  }

  return (
    <li className={['item-row', item.state === 'ignorado' ? 'habit-item--skipped' : ''].filter(Boolean).join(' ')}>
      {item.measurementType === 'check' ? (
        <input className="habit-check" type="checkbox" checked={item.completed} disabled={busy || item.state === 'ignorado'} aria-label={`Concluir ${item.title}`} onChange={() => void toggleCheck()} />
      ) : <span className="habit-progress-dot" aria-hidden="true">{item.completed ? '✓' : ''}</span>}
      <div className="item-row__main">
        <span className="item-row__title">{item.title}</span>
        <span className="item-row__meta">{formatHabitProgress(item)}{item.habitId ? ' · hábito reutilizável' : ' · atividade avulsa'}</span>
        {item.records.some((record) => record.startedAt && record.endedAt) ? (
          <span className="item-row__meta">{item.records.filter((record) => record.startedAt && record.endedAt).map((record) => `${new Date(record.startedAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–${new Date(record.endedAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`).join(', ')}</span>
        ) : null}
      </div>
      <Badge tone={item.completed ? 'success' : item.state === 'ignorado' ? 'neutral' : 'warning'}>{item.completed ? 'Concluído' : item.state === 'ignorado' ? 'Ignorado' : 'Pendente'}</Badge>
      <div className="item-row__actions">
        {item.measurementType !== 'check' && item.state !== 'ignorado' ? <Button variant="secondary" onClick={() => drawer.open({ kind: 'registro-habito', item })}>Registrar</Button> : null}
        <Button variant="ghost" disabled={busy} onClick={() => void state.mutateAsync({ id: item.id, state: item.state === 'ignorado' ? 'planejado' : 'ignorado' })}>{item.state === 'ignorado' ? 'Reativar' : 'Ignorar'}</Button>
        {item.records.length === 0 ? <Button variant="ghost" disabled={busy} onClick={() => void removeItem.mutateAsync(item.id)}>Excluir</Button> : null}
      </div>
    </li>
  )
}
