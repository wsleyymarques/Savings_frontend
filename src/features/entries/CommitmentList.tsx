import { useMemo } from 'react'
import { useDrawer } from '../../app/contexts'
import { Money } from '../../components/finance/Money'
import { StatCard } from '../../components/finance/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '../../components/ui/DropdownMenu'
import { IconButton } from '../../components/ui/IconButton'
import { EmptyState } from '../../components/ui/States'
import { SurfaceCard } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/toastContext'
import { addMonths, endOfMonth, formatDate, startOfMonth } from '../../lib/date'
import { today } from '../../lib/today'
import { messageFor, type PersonalCommitment } from '../../services'
import {
  useCommitmentOccurrencesQuery,
  useCommitmentsQuery,
  useCommitmentStatusMutation,
} from '../../services/queries'
import { QueryBoundary } from '../shared/QueryBoundary'

/**
 * Compromissos pessoais fazem parte dos lançamentos: as ocorrências previstas já
 * aparecem na lista de lançamentos e aqui o usuário administra cada compromisso.
 */
export function CommitmentList({ accountId, enabled }: { accountId: string | null; enabled: boolean }) {
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
            if (!visible.length) return <EmptyState icon="lancamentos" title="Nenhum compromisso pessoal" description="Cadastre pagamentos parcelados ou recorrentes destinados a alguém." action={<Button onClick={() => drawer.open({ kind: 'compromisso' })}>Criar compromisso</Button>} />
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
