import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { useDrawer, useSession } from '../../app/contexts'
import { useGoalCyclesQuery } from '../../services/queries'
import { formatPercent } from '../../lib/goals'
import { formatDate } from '../../lib/date'
import { QueryBoundary } from '../shared/QueryBoundary'
import { CYCLE_STATUS_LABEL, marginTone } from './labels'

export function GoalsPage() {
  const { status } = useSession()
  const drawer = useDrawer()
  const cycles = useGoalCyclesQuery(status === 'authenticated')

  return (
    <>
      <PageHeader
        title="Metas"
        description="Objetivos por ciclo e a margem de erro entre o esperado e o alcançado."
        actions={
          <Button variant="primary" icon="plus" onClick={() => drawer.open({ kind: 'ciclo-meta' })}>
            Novo ciclo
          </Button>
        }
      />

      <QueryBoundary query={cycles} rows={3}>
        {(items) =>
          items.length === 0 ? (
            <SurfaceCard>
              <EmptyState
                icon="trending"
                title="Nenhum ciclo criado"
                description="Um ciclo é o período que agrupa seus objetivos, como um trimestre. A margem de erro esperada é declarada aqui, antes do resultado."
                action={
                  <Button
                    variant="secondary"
                    icon="plus"
                    onClick={() => drawer.open({ kind: 'ciclo-meta' })}
                  >
                    Criar primeiro ciclo
                  </Button>
                }
              />
            </SurfaceCard>
          ) : (
            <SurfaceCard title="Ciclos" description="Do mais recente para o mais antigo.">
              <ul className="item-list">
                {items.map((cycle) => {
                  const closed = cycle.status === 'encerrado'
                  const margin = closed ? cycle.realErrorMargin : cycle.projectedErrorMargin
                  return (
                    <li key={cycle.id} className="item-row">
                      <span className="state-block__icon" style={{ width: 32, height: 32 }}>
                        <Icon name="trending" size={16} />
                      </span>
                      <div className="item-row__main">
                        <Link className="item-row__title" to={`/habits/metas/${cycle.id}`}>
                          {cycle.name}
                        </Link>
                        <span className="item-row__meta">
                          {formatDate(cycle.startDate)} a {formatDate(cycle.endDate)} ·{' '}
                          {cycle.objectiveCount} objetivo{cycle.objectiveCount === 1 ? '' : 's'} ·
                          esperada {formatPercent(cycle.expectedErrorMargin)}
                        </span>
                      </div>
                      <span className="item-row__value">
                        {closed ? 'Margem real' : 'Projetada'} {formatPercent(margin)}
                      </span>
                      <Badge tone={marginTone(cycle, margin)}>{CYCLE_STATUS_LABEL[cycle.status]}</Badge>
                    </li>
                  )
                })}
              </ul>
            </SurfaceCard>
          )
        }
      </QueryBoundary>
    </>
  )
}
