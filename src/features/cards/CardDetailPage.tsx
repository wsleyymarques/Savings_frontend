import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { CreditUsage } from '../../components/finance/CreditUsage'
import { Money } from '../../components/finance/Money'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/States'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useCardQuery } from '../../services/queries'
import { formatDate } from '../../lib/date'
import { CARD_FUNCTION_LABEL } from '../../data/types'
import { CardVisual } from './CardVisual'
import { QueryBoundary } from '../shared/QueryBoundary'

export function CardDetailPage() {
  const { id = '' } = useParams()
  const { accountId } = useScope()
  const { status } = useSession()
  const drawer = useDrawer()

  const card = useCardQuery(id, status === 'authenticated')
  const outOfScope = card.isSuccess && accountId !== null && card.data.accountId !== accountId

  if (outOfScope) return <Navigate to="/cartoes" replace />

  return (
    <>
      <PageHeader
        title={card.data?.name ?? 'Cartão'}
        description={
          <Link to="/cartoes" className="text-secondary">
            ← Voltar para cartões
          </Link>
        }
        actions={
          <Button variant="secondary" icon="edit" onClick={() => drawer.open({ kind: 'cartao', id })}>
            Editar cartão
          </Button>
        }
      />

      <QueryBoundary query={card} rows={3}>
        {(data) => (
          <>
            <div className="grid grid--two">
              <SurfaceCard>
                <CardVisual
                  name={data.name}
                  accountName={data.accountName}
                  functions={data.functions}
                  color={data.color}
                />
              </SurfaceCard>
              <SurfaceCard title="Situação do crédito">
                {data.creditLimit !== null ? (
                  <>
                    <CreditUsage limit={data.creditLimit} committed={data.committed} />
                    <div className="card-tile__dates" style={{ marginTop: 'var(--space-3)' }}>
                      <span>Fechamento: dia {data.closingDay}</span>
                      <span>Vencimento: dia {data.dueDay}</span>
                      <span>{CARD_FUNCTION_LABEL[data.functions]}</span>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon="cartoes"
                    title="Cartão somente de débito"
                    description={`As compras saem do saldo da conta ${data.accountName}.`}
                  />
                )}
              </SurfaceCard>
            </div>

            {data.functions !== 'debito' ? (
              <SurfaceCard title="Compras no crédito">
                {data.creditPurchases.length === 0 ? (
                  <EmptyState title="Nenhuma compra no crédito" />
                ) : (
                  <ul className="item-list">
                    {data.creditPurchases.map((purchase) => (
                      <li key={purchase.id} className="item-row">
                        <div className="item-row__main">
                          <span className="item-row__title">{purchase.description}</span>
                          <span className="item-row__meta">
                            {formatDate(purchase.date)} · {purchase.categoryName}
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
            ) : null}

            {data.functions !== 'credito' ? (
              <SurfaceCard title="Compras no débito">
                {data.debitPurchases.length === 0 ? (
                  <EmptyState title="Nenhuma compra no débito" />
                ) : (
                  <ul className="item-list">
                    {data.debitPurchases.map((purchase) => (
                      <li key={purchase.id} className="item-row">
                        <div className="item-row__main">
                          <span className="item-row__title">{purchase.description}</span>
                          <span className="item-row__meta">
                            {formatDate(purchase.date)} · {purchase.categoryName}
                          </span>
                        </div>
                        <span className="item-row__value">
                          <Money value={-purchase.amount} signed />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SurfaceCard>
            ) : null}

            {data.invoices.length > 0 ? (
              <SurfaceCard title="Faturas do cartão">
                <ul className="item-list">
                  {data.invoices.map((invoice) => (
                    <li key={invoice.id} className="item-row">
                      <div className="item-row__main">
                        <span className="item-row__title">{invoice.cycleLabel}</span>
                        <span className="item-row__meta">
                          Fecha em {formatDate(invoice.closingDate)} · vence em {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                      <Badge tone={invoice.cycle === 'fechada' ? 'neutral' : 'info'}>
                        {invoice.cycle === 'fechada' ? 'Fechada' : 'Aberta'}
                      </Badge>
                      <Badge tone={invoice.payment === 'paga' ? 'success' : 'warning'}>
                        {invoice.payment === 'paga' ? 'Paga' : 'Não paga'}
                      </Badge>
                      <span className="item-row__value">
                        <Money value={invoice.total} />
                      </span>
                      <div className="item-row__actions">
                        <Link className="btn btn--secondary" to={`/faturas/${invoice.id}`}>
                          Ver fatura
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
            ) : null}
          </>
        )}
      </QueryBoundary>
    </>
  )
}
