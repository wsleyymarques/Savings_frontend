import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDrawer } from '../../app/contexts'
import { Money } from '../../components/finance/Money'
import { StatCard } from '../../components/finance/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { SurfaceCard } from '../../components/ui/Surface'
import { addMonths, endOfMonth, formatDate, startOfMonth } from '../../lib/date'
import { today } from '../../lib/today'
import type { CommitmentOccurrence } from '../../services'
import { useCommitmentOccurrencesQuery, useInvoicesQuery } from '../../services/queries'
import { QueryBoundary } from '../shared/QueryBoundary'

/**
 * Contas a pagar: o que já está combinado com outra pessoa e ainda não foi
 * pago, mais as faturas de cartão em aberto. É a leitura oposta da aba de
 * compromissos, que administra as obrigações; aqui só interessa o que vence.
 */
export function BillsToPay({ accountId, enabled }: { accountId: string | null; enabled: boolean }) {
  const drawer = useDrawer()
  const range = useMemo(() => billsRange(), [])
  const occurrences = useCommitmentOccurrencesQuery(
    { accountId, start: '2000-01-01', end: range.end },
    enabled,
  )
  const invoices = useInvoicesQuery({ accountId }, enabled)

  const openInvoices = (invoices.data ?? [])
    .filter((invoice) => invoice.payment !== 'paga' && invoice.remaining > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  // O card soma só o caixa do mês — o que vence até o fim do mês corrente mais
  // o que já venceu sem pagamento. A tabela abaixo continua listando todas as
  // faturas em aberto, inclusive as dos meses seguintes.
  const invoicesDueThisMonth = openInvoices.filter((invoice) => invoice.dueDate <= range.monthEnd)
  const overdueInvoices = invoicesDueThisMonth.filter((invoice) => invoice.dueDate < range.today)

  return (
    <div className="planning-stack">
      <QueryBoundary query={occurrences} rows={2}>
        {(rows) => {
          const pending = rows
            .filter((item) => item.status !== 'pago')
            .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
          const overdue = pending.filter((item) => item.scheduledDate < range.today)
          const thisMonth = pending.filter(
            (item) =>
              item.scheduledDate >= range.today &&
              item.scheduledDate <= range.monthEnd,
          )
          const later = pending.filter((item) => item.scheduledDate > range.monthEnd)

          return (
            <>
              <SurfaceCard
                title="Quanto falta pagar"
                description="Ocorrências de compromissos ainda não registradas como pagas."
              >
                <div className="planning-stats">
                  <StatCard
                    label="Em atraso"
                    value={sumAmounts(overdue)}
                    caption={`${overdue.length} pagamento(s)`}
                  />
                  <StatCard
                    label="A vencer neste mês"
                    value={sumAmounts(thisMonth)}
                    caption={`${thisMonth.length} pagamento(s)`}
                    highlight
                  />
                  <StatCard
                    label="Faturas em aberto"
                    value={invoicesDueThisMonth.reduce((total, invoice) => total + invoice.remaining, 0)}
                    caption={
                      overdueInvoices.length > 0
                        ? `${invoicesDueThisMonth.length} fatura(s) · ${overdueInvoices.length} em atraso`
                        : `${invoicesDueThisMonth.length} fatura(s) neste mês`
                    }
                  />
                </div>
              </SurfaceCard>

              <BillsSection
                title="Em atraso"
                description="Data prevista já passou e o pagamento não foi registrado."
                emptyTitle="Nada em atraso"
                rows={overdue}
                onPay={(item) =>
                  drawer.open({ kind: 'pagar-compromisso', id: item.commitmentId, occurrence: item })
                }
              />

              <BillsSection
                title="A vencer neste mês"
                description={`Até ${formatDate(range.monthEnd)}.`}
                emptyTitle="Nenhum pagamento previsto até o fim do mês"
                rows={thisMonth}
                onPay={(item) =>
                  drawer.open({ kind: 'pagar-compromisso', id: item.commitmentId, occurrence: item })
                }
              />

              <BillsSection
                title="Próximos meses"
                description="Previsão dos próximos doze meses."
                emptyTitle="Nenhum pagamento previsto adiante"
                rows={later.slice(0, 36)}
                onPay={(item) =>
                  drawer.open({ kind: 'pagar-compromisso', id: item.commitmentId, occurrence: item })
                }
              />
            </>
          )
        }}
      </QueryBoundary>

      <SurfaceCard
        flush
        title="Faturas de cartão em aberto"
        description="A quitação registra a saída de dinheiro; as compras já foram contabilizadas."
      >
        {openInvoices.length === 0 ? (
          <EmptyState icon="faturas" title="Nenhuma fatura em aberto" />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Vencimento</th>
                  <th scope="col">Cartão</th>
                  <th scope="col">Ciclo</th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="cell-money">
                    Restante
                  </th>
                  <th scope="col" className="cell-actions">
                    <span className="visually-hidden">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {openInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="tabular">{formatDate(invoice.dueDate)}</td>
                    <td>
                      <strong>{invoice.cardName}</strong>
                    </td>
                    <td>{invoice.cycleLabel}</td>
                    <td>
                      <Badge tone={invoice.cycle === 'fechada' ? 'warning' : 'info'}>
                        {invoice.cycle === 'fechada' ? 'Fechada' : 'Aberta'}
                      </Badge>
                    </td>
                    <td className="cell-money">
                      <Money value={invoice.remaining} />
                    </td>
                    <td className="cell-actions">
                      <div className="item-row__actions">
                        <Link className="btn btn--secondary" to={`/faturas/${invoice.id}`}>
                          Ver fatura
                        </Link>
                        <Button
                          variant="primary"
                          onClick={() => drawer.open({ kind: 'pagamento', invoiceId: invoice.id })}
                        >
                          Pagar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}

function BillsSection({
  title,
  description,
  emptyTitle,
  rows,
  onPay,
}: {
  title: string
  description: string
  emptyTitle: string
  rows: CommitmentOccurrence[]
  onPay: (item: CommitmentOccurrence) => void
}) {
  return (
    <SurfaceCard flush title={title} description={description}>
      {rows.length === 0 ? (
        <EmptyState icon="calendar" title={emptyTitle} />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Data prevista</th>
                <th scope="col">Beneficiário</th>
                <th scope="col">Descrição</th>
                <th scope="col">Ocorrência</th>
                <th scope="col" className="cell-money">
                  Valor
                </th>
                <th scope="col" className="cell-actions">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td className="tabular">
                    {formatDate(item.scheduledDate)}
                    {item.status === 'atrasado' ? (
                      <div>
                        <Badge tone="warning">Em atraso</Badge>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <strong>{item.beneficiaryName}</strong>
                  </td>
                  <td>{item.description}</td>
                  <td>
                    {item.installmentNumber
                      ? `${item.installmentNumber}/${item.installmentCount}`
                      : 'Recorrente'}
                  </td>
                  <td className="cell-money">
                    <Money value={item.amount} />
                  </td>
                  <td className="cell-actions">
                    <Button variant="secondary" onClick={() => onPay(item)}>
                      Registrar pagamento
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SurfaceCard>
  )
}

function billsRange() {
  const current = today()
  return {
    today: current,
    monthStart: startOfMonth(current),
    monthEnd: endOfMonth(current),
    end: endOfMonth(addMonths(current, 12)),
  }
}

function sumAmounts(items: Array<{ amount: number }>): number {
  return items.reduce((total, item) => total + item.amount, 0)
}
