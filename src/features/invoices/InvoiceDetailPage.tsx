import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Badge } from '../../components/ui/Badge'
import { Money } from '../../components/finance/Money'
import { Button } from '../../components/ui/Button'
import { EmptyState, InlineAlert } from '../../components/ui/States'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useCardQuery, useInvoiceQuery } from '../../services/queries'
import { formatDate } from '../../lib/date'
import { QueryBoundary } from '../shared/QueryBoundary'

export function InvoiceDetailPage() {
  const { id = '' } = useParams()
  const { accountId } = useScope()
  const { status } = useSession()
  const drawer = useDrawer()

  const invoice = useInvoiceQuery(id, status === 'authenticated')
  const card = useCardQuery(invoice.data?.cardId ?? '', invoice.isSuccess)
  const outOfScope = card.isSuccess && accountId !== null && card.data.accountId !== accountId

  if (outOfScope) return <Navigate to="/faturas" replace />

  return (
    <>
      <PageHeader
        title={invoice.data ? `Fatura · ${invoice.data.cycleLabel}` : 'Fatura'}
        description={
          <Link to="/faturas" className="text-secondary">
            ← Voltar para faturas
          </Link>
        }
        actions={
          invoice.data?.payable ? (
            <Button variant="primary" onClick={() => drawer.open({ kind: 'pagamento', invoiceId: id })}>
              Registrar pagamento
            </Button>
          ) : undefined
        }
      />

      <QueryBoundary query={invoice} rows={3}>
        {(data) => (
          <>
            <SurfaceCard
              title={data.cardName}
              actions={
                <>
                  <Badge tone={data.cycle === 'fechada' ? 'neutral' : 'info'}>
                    {data.cycle === 'fechada' ? 'Fechada' : 'Aberta'}
                  </Badge>
                  <Badge tone={data.payment === 'paga' ? 'success' : 'warning'}>
                    {data.payment === 'paga' ? 'Paga' : 'Não paga'}
                  </Badge>
                </>
              }
            >
              <div className="invoice-summary">
                <div className="invoice-summary__item">
                  <span className="invoice-summary__label">Período de compras</span>
                  <span className="invoice-summary__value">
                    {formatDate(data.periodStart)} a {formatDate(data.periodEnd)}
                  </span>
                </div>
                <div className="invoice-summary__item">
                  <span className="invoice-summary__label">Fechamento</span>
                  <span className="invoice-summary__value">{formatDate(data.closingDate)}</span>
                </div>
                <div className="invoice-summary__item">
                  <span className="invoice-summary__label">Vencimento</span>
                  <span className="invoice-summary__value">{formatDate(data.dueDate)}</span>
                </div>
                <div className="invoice-summary__item">
                  <span className="invoice-summary__label">Total</span>
                  <span className="invoice-summary__value">
                    <Money value={data.total} />
                  </span>
                </div>
                <div className="invoice-summary__item">
                  <span className="invoice-summary__label">Valor pago</span>
                  <span className="invoice-summary__value">
                    <Money value={data.paid} />
                  </span>
                </div>
                <div className="invoice-summary__item">
                  <span className="invoice-summary__label">Restante</span>
                  <span className="invoice-summary__value">
                    <Money value={data.remaining} />
                  </span>
                </div>
              </div>
              {data.cycle === 'aberta' ? (
                <InlineAlert tone="info">
                  O ciclo ainda está aberto. O registro de pagamento integral fica disponível após o
                  fechamento em {formatDate(data.closingDate)}.
                </InlineAlert>
              ) : null}
            </SurfaceCard>

            <SurfaceCard
              title="Compras da fatura"
              description="O ciclo selecionado não implica que todas as compras aconteceram no mesmo mês."
            >
              {data.purchases.length === 0 ? (
                <EmptyState title="Nenhuma compra neste ciclo" />
              ) : (
                <ul className="item-list">
                  {data.purchases.map((purchase) => (
                    <li key={purchase.id} className="item-row">
                      <div className="item-row__main">
                        <span className="item-row__title">
                          {purchase.description}
                          {purchase.expenseMode === 'parcelada'
                            ? ` · ${purchase.installmentNumber}/${purchase.installmentCount}`
                            : purchase.expenseMode === 'recorrente'
                              ? ' · Recorrente'
                              : ''}
                        </span>
                        <span className="item-row__meta">
                          Compra em {formatDate(purchase.date)} · {purchase.categoryName}
                        </span>
                      </div>
                      <span className="item-row__value">
                        <Money value={purchase.amount} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SurfaceCard>

            {data.payments.length > 0 ? (
              <SurfaceCard title="Registro de pagamento">
                <ul className="item-list">
                  {data.payments.map((payment) => (
                    <li key={payment.id} className="item-row">
                      <div className="item-row__main">
                        <span className="item-row__title">Pago pela conta {payment.accountName}</span>
                        <span className="item-row__meta">
                          Registrado em {formatDate(payment.date)} · quitação de compras já contabilizadas
                        </span>
                      </div>
                      <span className="item-row__value">
                        <Money value={payment.amount} />
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="caption text-muted" style={{ marginTop: 'var(--space-3)' }}>
                  Este é o comprovante interno do registro. A aplicação não emite comprovante bancário.
                </p>
              </SurfaceCard>
            ) : null}
          </>
        )}
      </QueryBoundary>
    </>
  )
}
