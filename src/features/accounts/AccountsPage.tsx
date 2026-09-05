import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { StatCard } from '../../components/finance/StatCard'
import { Money } from '../../components/finance/Money'
import { Button } from '../../components/ui/Button'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useAccountsQuery } from '../../services/queries'
import { formatDate } from '../../lib/date'
import { sum } from '../../lib/money'
import { QueryBoundary } from '../shared/QueryBoundary'
import { NoAccounts } from '../shared/NoAccounts'

export function AccountsPage() {
  const { accountId } = useScope()
  const { status } = useSession()
  const { scopeLabel } = useAccountScope()
  const drawer = useDrawer()

  const accounts = useAccountsQuery({ accountId }, status === 'authenticated')

  return (
    <>
      <PageHeader
        title="Contas"
        description="Consulte o saldo das suas contas"
        actions={
          <Button variant="primary" icon="plus" onClick={() => drawer.open({ kind: 'conta' })}>
            Nova conta
          </Button>
        }
      />

      <QueryBoundary query={accounts} rows={3}>
        {(items) =>
          items.length === 0 ? (
            <SurfaceCard>
              <NoAccounts />
            </SurfaceCard>
          ) : (
            <>
              <div className="grid grid--stats">
                <StatCard
                  label={`Saldo em ${scopeLabel.toLowerCase()}`}
                  value={sum(items.map((account) => account.currentBalance))}
                  caption="Saldo calculado pelos lançamentos registrados"
                  highlight
                />
              </div>

              <SurfaceCard title="Suas contas">
                <ul className="item-list">
                  {items.map((account) => (
                    <li key={account.id} className="item-row">
                      <div className="item-row__main">
                        <span className="item-row__title">{account.name}</span>
                        <span className="item-row__meta">
                          Saldo inicial de <Money value={account.initialBalance} /> em{' '}
                          {formatDate(account.referenceDate)}
                        </span>
                      </div>
                      <span className="item-row__value">
                        <Money value={account.currentBalance} />
                      </span>
                      <div className="item-row__actions">
                        <Link className="btn btn--secondary" to={`/contas/${account.id}`}>
                          Ver detalhes
                        </Link>
                        <Button
                          variant="ghost"
                          icon="edit"
                          onClick={() => drawer.open({ kind: 'conta', id: account.id })}
                        >
                          Editar conta
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="caption text-muted" style={{ marginTop: 'var(--space-3)' }}>
                  Saldo calculado pelos lançamentos registrados. Não há sincronização ou conciliação bancária.
                </p>
              </SurfaceCard>
            </>
          )
        }
      </QueryBoundary>
    </>
  )
}
