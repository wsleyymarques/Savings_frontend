import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { StatCard } from '../../components/finance/StatCard'
import { Money } from '../../components/finance/Money'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/States'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountQuery } from '../../services/queries'
import { formatDate } from '../../lib/date'
import { CARD_FUNCTION_LABEL, PAYMENT_METHOD_SHORT } from '../../data/types'
import { QueryBoundary } from '../shared/QueryBoundary'

export function AccountDetailPage() {
  const { id = '' } = useParams()
  const { accountId } = useScope()
  const { status } = useSession()
  const drawer = useDrawer()

  const outOfScope = accountId !== null && accountId !== id
  const account = useAccountQuery(id, status === 'authenticated' && !outOfScope)

  // Detalhe fora do escopo atual volta para a listagem (design.md, 4.3).
  if (outOfScope) return <Navigate to="/contas" replace />

  return (
    <>
      <PageHeader
        title={account.data?.name ?? 'Conta'}
        description={
          <Link to="/contas" className="text-secondary">
            ← Voltar para contas
          </Link>
        }
        actions={
          <Button variant="secondary" icon="edit" onClick={() => drawer.open({ kind: 'conta', id })}>
            Editar conta
          </Button>
        }
      />

      <QueryBoundary query={account} rows={3}>
        {(data) => (
          <>
            <div className="grid grid--stats">
              <StatCard label="Saldo atual" value={data.currentBalance} highlight />
              <StatCard
                label="Saldo inicial"
                value={data.initialBalance}
                compact
                caption={`Referência ${formatDate(data.referenceDate)}`}
              />
            </div>

            <SurfaceCard
              title="Movimentações efetivas"
              description="Receitas e saídas de dinheiro que alteram o saldo desta conta."
            >
              {data.movements.length === 0 ? (
                <EmptyState title="Nenhuma movimentação registrada" />
              ) : (
                <ul className="item-list">
                  {data.movements.map((row) => (
                    <li key={row.id} className="item-row">
                      <div className="item-row__main">
                        <span className="item-row__title">{row.description}</span>
                        <span className="item-row__meta">
                          {formatDate(row.date)}
                          {row.method ? ` · ${PAYMENT_METHOD_SHORT[row.method]}` : ''}
                        </span>
                      </div>
                      <span className="item-row__value">
                        <Money value={row.amount} signed />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SurfaceCard>

            <SurfaceCard
              title="Compras no crédito"
              description="Estas compras entram na fatura do cartão e não saem do saldo agora."
            >
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

            <SurfaceCard title="Cartões vinculados">
              {data.cards.length === 0 ? (
                <EmptyState icon="cartoes" title="Nenhum cartão vinculado" />
              ) : (
                <ul className="item-list">
                  {data.cards.map((card) => (
                    <li key={card.id} className="item-row">
                      <div className="item-row__main">
                        <span className="item-row__title">{card.name}</span>
                        <span className="item-row__meta">{CARD_FUNCTION_LABEL[card.functions]}</span>
                      </div>
                      {card.creditLimit !== null ? (
                        <Badge tone="info">Crédito</Badge>
                      ) : (
                        <Badge>Somente débito</Badge>
                      )}
                      <div className="item-row__actions">
                        <Link className="btn btn--secondary" to={`/cartoes/${card.id}`}>
                          Ver cartão
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SurfaceCard>
          </>
        )}
      </QueryBoundary>
    </>
  )
}
