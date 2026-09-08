import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState, InlineAlert } from '../../components/ui/States'
import { useToast } from '../../components/ui/toastContext'
import { useDrawer } from '../../app/contexts'
import { formatDate } from '../../lib/date'
import { formatGoalValue, formatPercent, METRIC_LABEL } from '../../lib/goals'
import { messageFor } from '../../services'
import type { GoalCycleDetail, GoalObjectiveRow } from '../../services'
import {
  useAbandonGoalObjectiveMutation,
  useCloseGoalCycleMutation,
  useDeleteGoalCycleMutation,
  useDeleteGoalObjectiveMutation,
  useGoalCycleQuery,
  useReopenGoalCycleMutation,
} from '../../services/queries'
import { QueryBoundary } from '../shared/QueryBoundary'
import { CYCLE_STATUS_LABEL, OBJECTIVE_STATUS_LABEL } from './labels'

export function CycleDetailPage() {
  const { id = '' } = useParams()
  const cycle = useGoalCycleQuery(id)

  return (
    <QueryBoundary query={cycle} rows={4}>
      {(detail) => <CycleDetail detail={detail} />}
    </QueryBoundary>
  )
}

function CycleDetail({ detail }: { detail: GoalCycleDetail }) {
  const drawer = useDrawer()
  const toast = useToast()
  const navigate = useNavigate()
  const close = useCloseGoalCycleMutation()
  const reopen = useReopenGoalCycleMutation()
  const removeCycle = useDeleteGoalCycleMutation()

  const closed = detail.status === 'encerrado'
  const margin = closed ? detail.realErrorMargin : detail.projectedErrorMargin
  const error = close.error ?? reopen.error ?? removeCycle.error

  return (
    <>
      <PageHeader
        title={detail.name}
        description={`${formatDate(detail.startDate)} a ${formatDate(detail.endDate)} · ${
          CYCLE_STATUS_LABEL[detail.status]
        }`}
        actions={
          <>
            <Button icon="edit" onClick={() => drawer.open({ kind: 'ciclo-meta', id: detail.id })}>
              Editar ciclo
            </Button>
            {closed ? (
              <Button
                icon="retry"
                loading={reopen.isPending}
                onClick={() =>
                  reopen.mutate(detail.id, { onSuccess: () => toast.notify('Ciclo reaberto') })
                }
              >
                Reabrir
              </Button>
            ) : (
              <Button
                variant="primary"
                icon="check"
                loading={close.isPending}
                onClick={() =>
                  close.mutate(detail.id, {
                    onSuccess: () => toast.notify('Ciclo encerrado; margem real congelada'),
                  })
                }
              >
                Encerrar ciclo
              </Button>
            )}
          </>
        }
      />

      {error ? <InlineAlert tone="danger">{messageFor(error)}</InlineAlert> : null}

      <div className="grid grid--stats">
        <div className="stat">
          <span className="stat__label">Margem esperada</span>
          <span className="stat__value">{formatPercent(detail.expectedErrorMargin)}</span>
          <span className="stat__caption">Declarada antes do resultado.</span>
        </div>
        <div className={`stat${closed ? ' stat--highlight' : ''}`}>
          <span className="stat__label">{closed ? 'Margem real' : 'Margem projetada'}</span>
          <span className="stat__value">{formatPercent(margin)}</span>
          <span className="stat__caption">
            {closed
              ? 'Média dos erros ponderada pelo peso.'
              : 'Compara o atingimento com o ritmo do tempo decorrido.'}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Desvio</span>
          <span className="stat__value">
            {detail.deviation > 0 ? '+' : ''}
            {formatPercent(detail.deviation)}
          </span>
          <span className="stat__caption">
            {detail.objectiveCount === 0
              ? 'Sem objetivos cadastrados.'
              : detail.withinMargin
                ? 'Dentro da margem aceita.'
                : 'Fora da margem aceita.'}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Tempo decorrido</span>
          <span className="stat__value">{formatPercent(detail.elapsedFraction * 100, 0)}</span>
          <span className="stat__caption">Do início ao fim do ciclo.</span>
        </div>
      </div>

      <SurfaceCard
        title="Objetivos"
        description="O erro de cada objetivo é a distância que faltou até o alvo."
        actions={
          <Button
            variant="primary"
            icon="plus"
            disabled={closed}
            onClick={() => drawer.open({ kind: 'objetivo-meta', cycleId: detail.id })}
          >
            Novo objetivo
          </Button>
        }
      >
        {detail.objectives.length === 0 ? (
          <EmptyState
            icon="trending"
            title="Nenhum objetivo neste ciclo"
            description="Um objetivo pode ser uma contagem, um valor, um percentual a reduzir ou algo a concluir."
            action={
              <Button
                variant="secondary"
                icon="plus"
                disabled={closed}
                onClick={() => drawer.open({ kind: 'objetivo-meta', cycleId: detail.id })}
              >
                Adicionar objetivo
              </Button>
            }
          />
        ) : (
          <div className="planning-stack">
            {detail.objectives.map((objective) => (
              <ObjectiveCard
                key={objective.id}
                cycleId={detail.id}
                objective={objective}
                readOnly={closed}
              />
            ))}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard title="Ciclo" description="Remover apaga os objetivos e o progresso registrado.">
        <div className="row">
          <Button
            variant="danger"
            loading={removeCycle.isPending}
            onClick={() =>
              removeCycle.mutate(detail.id, {
                onSuccess: () => {
                  toast.notify('Ciclo removido')
                  navigate('/metas')
                },
              })
            }
          >
            Remover ciclo
          </Button>
        </div>
      </SurfaceCard>
    </>
  )
}

function ObjectiveCard({
  cycleId,
  objective,
  readOnly,
}: {
  cycleId: string
  objective: GoalObjectiveRow
  readOnly: boolean
}) {
  const drawer = useDrawer()
  const toast = useToast()
  const abandon = useAbandonGoalObjectiveMutation()
  const remove = useDeleteGoalObjectiveMutation()

  const progressLabel =
    objective.metricType === 'conclusao'
      ? objective.currentValue >= 1
        ? 'Concluído'
        : 'Não concluído'
      : objective.direction === 'reduzir'
        ? `${formatGoalValue(objective.currentValue, objective.unit)} · alvo ${formatGoalValue(
            objective.targetValue,
            objective.unit,
          )}`
        : `${formatGoalValue(objective.currentValue, objective.unit)} de ${formatGoalValue(
            objective.targetValue,
            objective.unit,
          )}`

  return (
    <article className="planning-card-summary">
      <div className="item-row__main">
        <span className="item-row__title">{objective.title}</span>
        <span className="item-row__meta">
          {METRIC_LABEL[objective.metricType]}
          {objective.direction === 'reduzir'
            ? ` · reduzir de ${formatGoalValue(objective.baselineValue, objective.unit)}`
            : ''}
          {objective.weight === 1 ? '' : ` · peso ${objective.weight}`}
        </span>
      </div>

      <div className="usage">
        <div
          className="usage__track"
          role="img"
          aria-label={`${progressLabel}. Erro de ${formatPercent(objective.errorPercent)}.`}
        >
          <div className="usage__fill" style={{ width: `${objective.attainment * 100}%` }} />
        </div>
        <div className="usage__legend">
          <span>{progressLabel}</span>
          <span>
            Erro {formatPercent(objective.errorPercent)} · aceito{' '}
            {formatPercent(objective.expectedErrorMargin)}
          </span>
        </div>
      </div>

      <div className="row">
        <Badge tone={objective.withinMargin ? 'success' : 'danger'}>
          {objective.withinMargin ? 'Dentro da margem' : 'Fora da margem'}
        </Badge>
        <Badge tone={objective.status === 'alcancado' ? 'success' : 'neutral'}>
          {OBJECTIVE_STATUS_LABEL[objective.status]}
        </Badge>
      </div>

      <div className="item-row__actions">
        <Button
          variant="secondary"
          icon="plus"
          disabled={readOnly}
          onClick={() => drawer.open({ kind: 'progresso-meta', objectiveId: objective.id })}
        >
          Registrar progresso
        </Button>
        <Button
          variant="ghost"
          icon="edit"
          disabled={readOnly}
          onClick={() => drawer.open({ kind: 'objetivo-meta', cycleId, id: objective.id })}
        >
          Editar
        </Button>
        {objective.status === 'abandonado' ? null : (
          <Button
            variant="ghost"
            disabled={readOnly}
            loading={abandon.isPending}
            onClick={() =>
              abandon.mutate(objective.id, {
                onSuccess: () => toast.notify('Objetivo marcado como abandonado'),
              })
            }
          >
            Abandonar
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={readOnly}
          loading={remove.isPending}
          onClick={() =>
            remove.mutate(objective.id, {
              onSuccess: () => toast.notify('Objetivo removido'),
              onError: (error) => toast.notify(messageFor(error)),
            })
          }
        >
          Remover
        </Button>
      </div>
    </article>
  )
}
