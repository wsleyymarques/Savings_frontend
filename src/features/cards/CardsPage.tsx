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
                <StatCard label="Crédito comprometido" value={data.totals.committed} compact />
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
