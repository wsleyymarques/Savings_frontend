import { useMemo, useState } from 'react'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { PageHeader } from '../../components/layout/PageHeader'
import { Money } from '../../components/finance/Money'
import { StatCard } from '../../components/finance/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '../../components/ui/DropdownMenu'
import { IconButton } from '../../components/ui/IconButton'
import { EmptyState, InlineAlert } from '../../components/ui/States'
import { SurfaceCard } from '../../components/ui/Surface'
import { Tabs } from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/toastContext'
import { addMonths, endOfMonth, formatDate, startOfMonth } from '../../lib/date'
import { today } from '../../lib/today'
import { messageFor, type PersonalCommitment, type PlannedExpense, type WishItem } from '../../services'
import {
  useArchiveWishMutation,
  useCancelPlannedExpenseMutation,
  useCommitmentOccurrencesQuery,
  useCommitmentsQuery,
  useCommitmentStatusMutation,
  usePlannedExpensesQuery,
  usePlanningSimulationQuery,
  useWishesQuery,
} from '../../services/queries'
import { QueryBoundary } from '../shared/QueryBoundary'

type PlanningTab = 'desejos' | 'gastos' | 'compromissos'

export function PlanningPage() {
  const [tab, setTab] = useState<PlanningTab>('desejos')
  const { accountId } = useScope()
  const { status } = useSession()
  const drawer = useDrawer()
  const enabled = status === 'authenticated'

  return (
    <>
      <PageHeader
        title="Planejamento"
        description="Organize desejos e simule compras antes que elas afetem seu dinheiro real."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => drawer.open(
              tab === 'desejos'
                ? { kind: 'desejo' }
                : tab === 'gastos'
                  ? { kind: 'gasto-planejado' }
                  : { kind: 'compromisso' },
            )}
          >
            {tab === 'desejos'
              ? 'Novo desejo'
              : tab === 'gastos'
                ? 'Novo gasto planejado'
                : 'Novo compromisso'}
          </Button>
        }
      />

      <SurfaceCard>
        <Tabs
          label="Área do planejamento"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'desejos', label: 'Lista de desejos' },
            { value: 'gastos', label: 'Gastos planejados' },
            { value: 'compromissos', label: 'Compromissos' },
          ]}
        />
      </SurfaceCard>

      {tab === 'desejos'
        ? <WishList enabled={enabled} />
        : tab === 'gastos'
          ? <PlannedExpenseList accountId={accountId} enabled={enabled} />
          : <CommitmentList accountId={accountId} enabled={enabled} />}
    </>
  )
}

function CommitmentList({ accountId, enabled }: { accountId: string | null; enabled: boolean }) {
  const drawer = useDrawer()
  const toast = useToast()
  const statusMutation = useCommitmentStatusMutation()
  const range = useMemo(() => commitmentRange(), [])
  const params = { accountId }
  const commitments = useCommitmentsQuery(params, enabled)
  const occurrences = useCommitmentOccurrencesQuery({ ...params, start: '2000-01-01', end: range.end }, enabled)

  async function changeStatus(item: PersonalCommitment, action: 'pause' | 'resume' | 'cancel') {
    if (action === 'cancel' && !window.confirm(`Cancelar o compromisso com “${item.beneficiaryName}”?`)) return
    try {
      await statusMutation.mutateAsync({ id: item.id, action })
      toast.notify(action === 'pause' ? 'Compromisso pausado' : action === 'resume' ? 'Compromisso retomado' : 'Compromisso cancelado')
    } catch (error) {
      toast.notifyError(messageFor(error))
    }
  }

  return (
    <div className="planning-stack">
      <SurfaceCard title="Previsão dos compromissos" description="Ocorrências previstas não alteram o saldo até o pagamento ser registrado.">
        <QueryBoundary query={occurrences} rows={2}>
          {(rows) => {
            const included = rows.filter((item) => item.includedInSimulation)
            const unpaid = included.filter((item) => item.status !== 'pago')
            const currentMonth = unpaid.filter((item) => item.scheduledDate >= range.monthStart && item.scheduledDate <= range.monthEnd)
            const future = unpaid.filter((item) => item.scheduledDate >= range.today)
            const overdue = unpaid.filter((item) => item.status === 'atrasado')
            return (
              <div className="planning-stats">
                <StatCard label="Previsto neste mês" value={sumAmounts(currentMonth)} caption={`${currentMonth.length} pagamento(s)`} />
                <StatCard label="Em atraso" value={sumAmounts(overdue)} caption={`${overdue.length} pendente(s)`} />
                <StatCard label="Próximos 12 meses" value={sumAmounts(future)} caption={`${future.length} ocorrência(s)`} highlight />
              </div>
            )
          }}
        </QueryBoundary>
      </SurfaceCard>

      <SurfaceCard flush title="Compromissos pessoais" description="Valores parcelados ou recorrentes combinados com outras pessoas.">
        <QueryBoundary query={commitments} rows={4}>
          {(items) => {
            const visible = items.filter((item) => item.status !== 'cancelado')
            if (!visible.length) return <EmptyState icon="planejamento" title="Nenhum compromisso pessoal" description="Cadastre pagamentos parcelados ou recorrentes destinados a alguém." action={<Button onClick={() => drawer.open({ kind: 'compromisso' })}>Criar compromisso</Button>} />
            return (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Beneficiário</th><th>Compromisso</th><th>Modalidade</th><th>Início</th><th>Conta</th><th className="cell-money">Por pagamento</th><th className="cell-actions"><span className="visually-hidden">Ações</span></th></tr></thead>
                  <tbody>
                    {visible.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.beneficiaryName}</strong><div><CommitmentStatusBadge item={item} /></div></td>
                        <td>{item.description}<div className="caption text-muted">{item.categoryName}</div></td>
                        <td>{item.schedule === 'parcelado' ? `${item.installmentCount} parcelas` : item.endDate ? `Recorrente até ${formatDate(item.endDate)}` : 'Recorrente'}</td>
                        <td>{formatDate(item.startDate)}<div className="caption text-muted">{item.paidOccurrences} pago(s)</div></td>
                        <td>{item.cardName ?? item.accountName}</td>
                        <td className="cell-money"><Money value={item.amount} /></td>
                        <td className="cell-actions">
                          {item.status === 'concluido' ? <Badge tone="success">Concluído</Badge> : (
                            <DropdownMenu
                              label={`Opções de ${item.description}`}
                              align="end"
                              trigger={({ ref, ...props }) => <IconButton ref={ref} icon="more" label={`Opções de ${item.description}`} {...props} />}
                            >
                              {(close) => <>
                                <MenuItem onClick={() => { close(); drawer.open({ kind: 'compromisso', id: item.id }) }}>Editar</MenuItem>
                                <MenuItem disabled={statusMutation.isPending} onClick={() => { close(); void changeStatus(item, item.status === 'pausado' ? 'resume' : 'pause') }}>{item.status === 'pausado' ? 'Retomar' : 'Pausar'}</MenuItem>
                                <MenuSeparator />
                                <MenuItem disabled={statusMutation.isPending} onClick={() => { close(); void changeStatus(item, 'cancel') }}>Cancelar compromisso</MenuItem>
                              </>}
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }}
        </QueryBoundary>
      </SurfaceCard>

      <SurfaceCard flush title="Próximos pagamentos" description="Registre cada ocorrência quando o dinheiro for efetivamente pago.">
        <QueryBoundary query={occurrences} rows={5}>
          {(rows) => {
            const pending = rows.filter((item) => item.status !== 'pago').slice(0, 36)
            if (!pending.length) return <EmptyState icon="calendar" title="Nenhum pagamento pendente" description="As próximas ocorrências aparecerão aqui." />
            return (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Data prevista</th><th>Beneficiário</th><th>Descrição</th><th>Ocorrência</th><th>Status</th><th className="cell-money">Valor</th><th className="cell-actions"><span className="visually-hidden">Ações</span></th></tr></thead>
                  <tbody>
                    {pending.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.scheduledDate)}</td>
                        <td><strong>{item.beneficiaryName}</strong></td>
                        <td>{item.description}</td>
                        <td>{item.installmentNumber ? `${item.installmentNumber}/${item.installmentCount}` : 'Recorrente'}</td>
                        <td><Badge tone={item.status === 'atrasado' ? 'warning' : 'info'}>{item.status === 'atrasado' ? 'Em atraso' : 'Previsto'}</Badge></td>
                        <td className="cell-money"><Money value={item.amount} /></td>
                        <td className="cell-actions"><Button variant="secondary" onClick={() => drawer.open({ kind: 'pagar-compromisso', id: item.commitmentId, occurrence: item })}>Registrar pagamento</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }}
        </QueryBoundary>
      </SurfaceCard>
    </div>
  )
}

function CommitmentStatusBadge({ item }: { item: PersonalCommitment }) {
  if (item.status === 'pausado') return <Badge tone="warning">Pausado</Badge>
  if (item.status === 'concluido') return <Badge tone="success">Concluído</Badge>
  return <Badge tone="info">Ativo</Badge>
}

function commitmentRange() {
  const current = today()
  return {
    today: current,
    monthStart: startOfMonth(current),
    monthEnd: endOfMonth(current),
    end: endOfMonth(addMonths(current, 12)),
  }
}

function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0)
}

function WishList({ enabled }: { enabled: boolean }) {
  const drawer = useDrawer()
  const toast = useToast()
  const query = useWishesQuery(enabled)
  const archive = useArchiveWishMutation()

  async function archiveItem(item: WishItem) {
    if (!window.confirm(`Arquivar “${item.description}”?`)) return
    try {
      await archive.mutateAsync(item.id)
      toast.notify('Desejo arquivado')
    } catch (error) {
      toast.notifyError(messageFor(error))
    }
  }

  return (
    <SurfaceCard flush title="Seus desejos" description="Desejos não entram nos cálculos até serem planejados.">
      <QueryBoundary query={query} rows={4}>
        {(items) => {
          const visible = items.filter((item) => item.status !== 'arquivado')
          if (!visible.length) {
            return (
              <EmptyState
                icon="planejamento"
                title="Sua lista de desejos está vazia"
                description="Adicione produtos que você pensa em comprar, sem alterar seu saldo ou limite."
                action={<Button onClick={() => drawer.open({ kind: 'desejo' })}>Adicionar desejo</Button>}
              />
            )
          }
          return (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Produto</th><th>Prioridade</th><th>Quando</th><th className="cell-money">Estimativa</th><th className="cell-actions"><span className="visually-hidden">Ações</span></th></tr></thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.description}</strong>
                        {item.productUrl ? <div><a className="caption" href={item.productUrl} target="_blank" rel="noreferrer">Ver produto</a></div> : null}
                      </td>
                      <td><Badge tone={item.priority === 'alta' ? 'warning' : 'neutral'}>{priorityLabel(item)}</Badge></td>
                      <td>{item.desiredDate ? formatDate(item.desiredDate) : 'Sem data'}</td>
                      <td className="cell-money"><Money value={item.estimatedAmount} /></td>
                      <td className="cell-actions">
                        {item.status === 'comprado' ? <Badge tone="success">Comprado</Badge> : (
                          <DropdownMenu
                            label={`Opções de ${item.description}`}
                            align="end"
                            trigger={({ ref, ...props }) => <IconButton ref={ref} icon="more" label={`Opções de ${item.description}`} {...props} />}
                          >
                            {(close) => <>
                              <MenuItem onClick={() => { close(); drawer.open({ kind: 'desejo', id: item.id }) }}>Editar</MenuItem>
                              <MenuItem onClick={() => { close(); drawer.open({ kind: 'gasto-planejado', wishId: item.id }) }}>Planejar compra</MenuItem>
                              <MenuSeparator />
                              <MenuItem disabled={archive.isPending} onClick={() => { close(); void archiveItem(item) }}>Arquivar</MenuItem>
                            </>}
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }}
      </QueryBoundary>
    </SurfaceCard>
  )
}

function PlannedExpenseList({ accountId, enabled }: { accountId: string | null; enabled: boolean }) {
  const drawer = useDrawer()
  const toast = useToast()
  const params = { accountId }
  const query = usePlannedExpensesQuery(params, enabled)
  const simulation = usePlanningSimulationQuery(params, enabled)
  const cancel = useCancelPlannedExpenseMutation()

  async function cancelItem(item: PlannedExpense) {
    if (!window.confirm(`Cancelar o planejamento de “${item.description}”?`)) return
    try {
      await cancel.mutateAsync(item.id)
      toast.notify('Planejamento cancelado')
    } catch (error) {
      toast.notifyError(messageFor(error))
    }
  }

  return (
    <div className="planning-stack">
      <SurfaceCard title="Cenário planejado" description="Valores simulados; ainda não alteram saldo, fatura ou limite.">
        <QueryBoundary query={simulation} rows={2}>
          {(data) => <>
            <div className="planning-stats">
              <StatCard label="Saldo atual" value={data.currentBalance} />
              <StatCard label="Compras planejadas" value={data.totalPlanned} caption={`${data.selectedCount} incluída(s)`} />
              <StatCard label="Após compras imediatas" value={data.balanceAfterPurchases} signedTone />
              <StatCard label="Após pagar os cartões" value={data.balanceAfterAllPayments} signedTone highlight />
            </div>
            {data.warnings.map((warning) => <InlineAlert key={warning} tone="warning">{warning}</InlineAlert>)}
            {data.cards.length ? (
              <div className="planning-card-grid">
                {data.cards.map((card) => (
                  <div className="planning-card-summary" key={card.id}>
                    <strong>{card.name}</strong>
                    <span className="caption text-muted">Limite depois dos planos</span>
                    <Money value={card.projectedAvailable ?? 0} />
                  </div>
                ))}
              </div>
            ) : null}
          </>}
        </QueryBoundary>
      </SurfaceCard>

      <SurfaceCard flush title="Gastos planejados" description="Use Registrar compra quando o gasto acontecer.">
        <QueryBoundary query={query} rows={4}>
          {(items) => {
            const visible = items.filter((item) => item.status !== 'cancelado')
            if (!visible.length) return <EmptyState icon="calendar" title="Nenhum gasto planejado" description="Crie uma simulação sem mexer nos lançamentos reais." action={<Button onClick={() => drawer.open({ kind: 'gasto-planejado' })}>Planejar gasto</Button>} />
            return (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Data</th><th>Descrição</th><th>Pagamento</th><th>Conta</th><th className="cell-money">Valor</th><th className="cell-actions"><span className="visually-hidden">Ações</span></th></tr></thead>
                  <tbody>
                    {visible.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.actualPurchaseDate ?? item.plannedDate)}</td>
                        <td><strong>{item.description}</strong><div className="caption text-muted">{item.categoryName}{item.includedInSimulation && item.status === 'planejado' ? ' · incluído na simulação' : ''}</div></td>
                        <td>{paymentLabel(item)}</td>
                        <td>{item.cardName ?? item.accountName}</td>
                        <td className="cell-money"><Money value={item.amount} /></td>
                        <td className="cell-actions">
                          {item.status === 'realizado' ? <Badge tone="success">Realizado</Badge> : (
                            <DropdownMenu
                              label={`Opções de ${item.description}`}
                              align="end"
                              trigger={({ ref, ...props }) => <IconButton ref={ref} icon="more" label={`Opções de ${item.description}`} {...props} />}
                            >
                              {(close) => <>
                                <MenuItem onClick={() => { close(); drawer.open({ kind: 'realizar-gasto', id: item.id }) }}>Registrar compra</MenuItem>
                                <MenuItem onClick={() => { close(); drawer.open({ kind: 'gasto-planejado', id: item.id }) }}>Editar</MenuItem>
                                <MenuSeparator />
                                <MenuItem disabled={cancel.isPending} onClick={() => { close(); void cancelItem(item) }}>Cancelar planejamento</MenuItem>
                              </>}
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }}
        </QueryBoundary>
      </SurfaceCard>
    </div>
  )
}

function priorityLabel(item: WishItem) {
  if (item.priority === 'alta') return 'Alta'
  if (item.priority === 'baixa') return 'Baixa'
  return 'Média'
}

function paymentLabel(item: PlannedExpense) {
  const labels = { pix: 'Pix', boleto: 'Boleto', debito: 'Débito', credito: 'Crédito' }
  if (item.expenseMode === 'parcelada') return `${labels[item.method]} · ${item.installmentCount}x`
  return labels[item.method]
}
