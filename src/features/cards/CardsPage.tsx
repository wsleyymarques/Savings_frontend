import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { StatCard } from '../../components/finance/StatCard'
import { CreditUsage } from '../../components/finance/CreditUsage'
import { Money } from '../../components/finance/Money'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/States'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useCardsQuery } from '../../services/queries'
import { formatDate } from '../../lib/date'
import { CardVisual } from './CardVisual'
import { QueryBoundary } from '../shared/QueryBoundary'
import { NoAccounts } from '../shared/NoAccounts'

export function CardsPage() {
  const { accountId } = useScope()
  const { status } = useSession()
  const { scopeLabel, hasAccounts, accountsLoaded } = useAccountScope()
  const drawer = useDrawer()

  const cards = useCardsQuery({ accountId }, status === 'authenticated')

  return (
    <>
      <PageHeader
        title="Cartões"
        description={`Funções, limites e faturas · ${scopeLabel}`}
        actions={
          <Button
            variant="primary"
            icon="plus"
            disabled={!hasAccounts}
            onClick={() => drawer.open({ kind: 'cartao' })}
          >
            Novo cartão
          </Button>
        }
      />

      {accountsLoaded && !hasAccounts ? (
        <SurfaceCard>
          <NoAccounts description="Um cartão precisa estar vinculado a uma conta financeira." />
        </SurfaceCard>
      ) : (
        <QueryBoundary query={cards} rows={3}>
          {(data) => (
            <>
              <div className="grid grid--stats">
                <StatCard label="Limite total de crédito" value={data.totals.limit} compact />
                <StatCard
                  label="Fatura atual dos cartões"
                  value={data.items.reduce((total, card) => total + (card.currentInvoice?.total ?? 0), 0)}
                  caption="Ciclo aberto, ainda em formação"
                  compact
                />
                <StatCard
                  label="Crédito comprometido"
                  value={data.totals.committed}
                  caption="Todas as faturas ainda não pagas"
                  compact
                />
                <StatCard label="Limite disponível" value={data.totals.available} compact highlight />
              </div>

              {data.items.length === 0 ? (
                <SurfaceCard>
                  <EmptyState
                    icon="cartoes"
                    title="Nenhum cartão cadastrado"
                    description="Cadastre um cartão para registrar compras no crédito ou no débito."
                    action={
                      <Button variant="primary" icon="plus" onClick={() => drawer.open({ kind: 'cartao' })}>
                        Novo cartão
                      </Button>
                    }
                  />
                </SurfaceCard>
              ) : (
                <div className="grid grid--cards">
                  {data.items.map((card) => (
                    <SurfaceCard key={card.id}>
                      <div className="card-tile">
                        <CardVisual
                          name={card.name}
                          accountName={card.accountName}
                          functions={card.functions}
                          color={card.color}
                        />

                        <div className="card-tile__metrics">
                          {card.creditLimit !== null ? (
                            <>
                              <CreditUsage limit={card.creditLimit} committed={card.committed} />
                              {card.currentInvoice ? (
                                <div className="card-tile__invoice">
                                  <div className="card-tile__invoice-copy">
                                    <span className="card-tile__invoice-label">
                                      Fatura atual · {card.currentInvoice.cycleLabel}
                                    </span>
                                    <strong className="card-tile__invoice-value">
                                      <Money value={card.currentInvoice.total} />
                                    </strong>
                                    <span className="caption text-muted">
                                      Fecha em {formatDate(card.currentInvoice.closingDate)} · vence em{' '}
                                      {formatDate(card.currentInvoice.dueDate)}
                                    </span>
                                  </div>
                                  {card.currentInvoice.id && card.currentInvoice.remaining > 0 ? (
                                    <Button
                                      variant="primary"
                                      onClick={() =>
                                        drawer.open({
                                          kind: 'pagamento',
                                          invoiceId: card.currentInvoice!.id!,
                                        })
                                      }
                                    >
                                      Pagar fatura
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                              <div className="card-tile__dates">
                                <span>Fechamento: dia {card.closingDay}</span>
                                <span>Vencimento: dia {card.dueDay}</span>
                              </div>
                            </>
                          ) : (
                            <div>
                              <Badge>Somente débito</Badge>
                              <p className="text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                                Usa o saldo da conta {card.accountName}:{' '}
                                <Money value={card.accountBalance} />
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="item-row__actions">
                          <Link className="btn btn--secondary" to={`/cartoes/${card.id}`}>
                            Ver detalhes
                          </Link>
                          <Button
                            variant="ghost"
                            icon="edit"
                            onClick={() => drawer.open({ kind: 'cartao', id: card.id })}
                          >
                            Editar cartão
                          </Button>
                        </div>
                      </div>
                    </SurfaceCard>
                  ))}
                </div>
              )}
            </>
          )}
        </QueryBoundary>
      )}
    </>
  )
}
