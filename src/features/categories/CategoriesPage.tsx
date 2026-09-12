import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState, InlineAlert } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useArchiveCategoryMutation, useCategoriesQuery } from '../../services/queries'
import { messageFor } from '../../services'
import { useToast } from '../../components/ui/toastContext'
import { QueryBoundary } from '../shared/QueryBoundary'
import { NoAccounts } from '../shared/NoAccounts'
import type { Id } from '../../data/types'

export function CategoriesPage() {
  const { accountId } = useScope()
  const { status } = useSession()
  const { scopeLabel, hasAccounts, accountsLoaded } = useAccountScope()
  const drawer = useDrawer()
  const toast = useToast()

  const categories = useCategoriesQuery({ accountId }, status === 'authenticated')
  const archive = useArchiveCategoryMutation()

  function handleArchive(id: Id) {
    archive.mutate(id, {
      onSuccess: () => toast.notify('Categoria arquivada'),
    })
  }

  return (
    <>
      <PageHeader
        title="Categorias"
        description={`Classificação dos gastos · ${scopeLabel}`}
        actions={
          <Button
            variant="primary"
            icon="plus"
            disabled={!hasAccounts}
            onClick={() =>
              drawer.open({ kind: 'categoria', accountId: accountId ?? undefined })
            }
          >
            Nova categoria
          </Button>
        }
      />

      {accountsLoaded && !hasAccounts ? (
        <SurfaceCard>
          <NoAccounts description="Categorias personalizadas pertencem a uma conta financeira." />
        </SurfaceCard>
      ) : (
        <QueryBoundary query={categories} rows={4}>
          {(items) => {
            const defaults = items.filter((category) => category.origin === 'padrao')
            const customs = items.filter((category) => category.origin === 'personalizada')

            return (
              <>
                {archive.isError ? (
                  <InlineAlert tone="danger">{messageFor(archive.error)}</InlineAlert>
                ) : null}

                <SurfaceCard
                  title="Categorias padrão"
                  description="Fornecidas pela aplicação e disponíveis em todas as contas. Não são editáveis."
                >
                  <ul className="item-list">
                    {defaults.map((category) => (
                      <li key={category.id} className="item-row">
                        <span className="state-block__icon" style={{ width: 32, height: 32 }}>
                          <Icon name="categorias" size={16} />
                        </span>
                        <div className="item-row__main">
                          <span className="item-row__title">{category.name}</span>
                        </div>
                        <Badge>Padrão</Badge>
                      </li>
                    ))}
                  </ul>
                </SurfaceCard>

                <SurfaceCard
                  title="Categorias personalizadas"
                  description="Criadas por você: valem em todas as contas ou apenas na conta escolhida."
                >
                  {customs.length === 0 ? (
                    <EmptyState
                      icon="categorias"
                      title="Nenhuma categoria personalizada"
                      description="As categorias padrão continuam disponíveis. Crie uma categoria própria quando precisar."
                      action={
                        <Button
                          variant="secondary"
                          icon="plus"
                          onClick={() =>
                            drawer.open({ kind: 'categoria', accountId: accountId ?? undefined })
                          }
                        >
                          Nova categoria
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="item-list">
                      {customs.map((category) => (
                        <li key={category.id} className="item-row">
                          <span className="state-block__icon" style={{ width: 32, height: 32 }}>
                            <Icon name="categorias" size={16} />
                          </span>
                          <div className="item-row__main">
                            <span className="item-row__title">{category.name}</span>
                            <span className="item-row__meta">
                              {category.accountName ? `Apenas ${category.accountName}` : 'Todas as contas'}
                            </span>
                          </div>
                          <Badge tone="info">Personalizada</Badge>
                          {category.archived ? <Badge tone="warning">Arquivada</Badge> : null}
                          <div className="item-row__actions">
                            {category.archived ? null : (
                              <>
                                <Button
                                  variant="ghost"
                                  icon="edit"
                                  onClick={() => drawer.open({ kind: 'categoria', id: category.id })}
                                >
                                  Renomear
                                </Button>
                                <Button
                                  variant="secondary"
                                  loading={archive.isPending && archive.variables === category.id}
                                  loadingLabel="Arquivando…"
                                  onClick={() => handleArchive(category.id)}
                                >
                                  Arquivar
                                </Button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="caption text-muted" style={{ marginTop: 'var(--space-3)' }}>
                    Arquivar preserva os gastos e totais históricos e remove a categoria das novas despesas.
                  </p>
                </SurfaceCard>
              </>
            )
          }}
        </QueryBoundary>
      )}
    </>
  )
}
