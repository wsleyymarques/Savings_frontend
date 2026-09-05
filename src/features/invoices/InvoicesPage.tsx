import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { SelectField } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { Money } from '../../components/finance/Money'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useCardsQuery, useInvoicesQuery } from '../../services/queries'
import { formatDate } from '../../lib/date'
import { QueryBoundary } from '../shared/QueryBoundary'

export function InvoicesPage() {
  const { accountId } = useScope()
  const { status } = useSession()
  const { scopeLabel } = useAccountScope()
  const drawer = useDrawer()

  const [cardId, setCardId] = useState('')
  const [cycleMonth, setCycleMonth] = useState('')

  const enabled = status === 'authenticated'
  const cards = useCardsQuery({ accountId }, enabled)
  const allInvoices = useInvoicesQuery({ accountId }, enabled)
  const invoices = useInvoicesQuery(
    { accountId, cardId: cardId || null, cycleMonth: cycleMonth || null },
    enabled,
  )

  const creditCards = (cards.data?.items ?? []).filter((card) => card.creditLimit !== null)
  const cycles = [
    ...new Map(
      (allInvoices.data ?? []).map((invoice) => [invoice.cycleMonth, invoice.cycleLabel]),
    ).entries(),
  ]
  const hasFilters = Boolean(cardId) || Boolean(cycleMonth)

  return (
    <>
      <PageHeader title="Faturas" description={`Ciclos de crédito · ${scopeLabel}`} />

      <QueryBoundary query={invoices} rows={3}>
        {(items) =>
          creditCards.length === 0 && items.length === 0 ? (
            <SurfaceCard>
              <EmptyState
                icon="faturas"
                title="Nenhum cartão de crédito no escopo"
                description="Faturas existem apenas para cartões com função crédito."
                action={
                  <Button variant="primary" icon="plus" onClick={() => drawer.open({ kind: 'cartao' })}>
                    Novo cartão
                  </Button>
                }
              />
            </SurfaceCard>
          ) : (
            <>
              <SurfaceCard>
                <div className="filter-bar">
                  <SelectField
                    label="Cartão"
                    value={cardId}
                    placeholder="Todos os cartões"
                    onChange={(event) => setCardId(event.target.value)}
                  >
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Ciclo"
                    value={cycleMonth}
                    placeholder="Todos os ciclos"
                    onChange={(event) => setCycleMonth(event.target.value)}
                  >
                    {cycles.map(([month, label]) => (
                      <option key={month} value={month}>
                        {label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </SurfaceCard>

              {items.length === 0 ? (
                <SurfaceCard>
                  <EmptyState
                    icon={hasFilters ? 'filter' : 'faturas'}
                    title={hasFilters ? 'Nenhuma fatura para os filtros' : 'Nenhuma fatura gerada'}
                    description={
                      hasFilters
                        ? 'Ajuste o cartão ou o ciclo selecionado.'
                        : 'As faturas aparecem quando houver compras no crédito.'
                    }
                    action={
                      hasFilters ? (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setCardId('')
                            setCycleMonth('')
                          }}
                        >
                          Limpar filtros
                        </Button>
                      ) : undefined
                    }
                  />
                </SurfaceCard>
              ) : (
                <div className="section-group">
                  {items.map((invoice) => (
                    <SurfaceCard
                      key={invoice.id}
                      title={`${invoice.cardName} · ${invoice.cycleLabel}`}
                      actions={
                        <>
                          <Badge tone={invoice.cycle === 'fechada' ? 'neutral' : 'info'}>
                            {invoice.cycle === 'fechada' ? 'Fechada' : 'Aberta'}
                          </Badge>
                          <Badge tone={invoice.payment === 'paga' ? 'success' : 'warning'}>
                            {invoice.payment === 'paga' ? 'Paga' : 'Não paga'}
                          </Badge>
                        </>
                      }
                    >
                      <div className="invoice-summary">
                        <div className="invoice-summary__item">
                          <span className="invoice-summary__label">Fechamento</span>
                          <span className="invoice-summary__value">{formatDate(invoice.closingDate)}</span>
                        </div>
                        <div className="invoice-summary__item">
                          <span className="invoice-summary__label">Vencimento</span>
                          <span className="invoice-summary__value">{formatDate(invoice.dueDate)}</span>
                        </div>
                        <div className="invoice-summary__item">
                          <span className="invoice-summary__label">Total de compras</span>
                          <span className="invoice-summary__value">
                            <Money value={invoice.total} />
                          </span>
                        </div>
                        <div className="invoice-summary__item">
                          <span className="invoice-summary__label">Valor pago</span>
                          <span className="invoice-summary__value">
                            <Money value={invoice.paid} />
                          </span>
                        </div>
                        <div className="invoice-summary__item">
                          <span className="invoice-summary__label">Restante</span>
                          <span className="invoice-summary__value">
                            <Money value={invoice.remaining} />
                          </span>
                        </div>
                      </div>

                      <div className="item-row__actions" style={{ marginTop: 'var(--space-4)' }}>
                        <Link className="btn btn--secondary" to={`/faturas/${invoice.id}`}>
                          Ver fatura
                        </Link>
                        {invoice.payable ? (
                          <Button
                            variant="primary"
                            onClick={() => drawer.open({ kind: 'pagamento', invoiceId: invoice.id })}
                          >
                            Registrar pagamento
                          </Button>
                        ) : null}
                      </div>
                    </SurfaceCard>
                  ))}
                </div>
              )}
            </>
          )
        }
      </QueryBoundary>
    </>
  )
}
