import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Tabs } from '../../components/ui/Tabs'
import { Badge } from '../../components/ui/Badge'
import { Money } from '../../components/finance/Money'
import { IconButton } from '../../components/ui/IconButton'
import { EmptyState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useCategoriesQuery, useTransactionsQuery } from '../../services/queries'
import { formatDate } from '../../lib/date'
import { today } from '../../lib/today'
import { buildPeriod, DEFAULT_PERIOD_PRESET, type PeriodPreset } from '../../lib/period'
import { PAYMENT_METHOD_SHORT, type ExpenseMode, type PaymentMethod } from '../../data/types'
import { QueryBoundary } from '../shared/QueryBoundary'
import { PeriodFilter } from '../shared/PeriodFilter'
import { NoAccounts } from '../shared/NoAccounts'
import { NewEntryMenu } from '../shared/NewEntryMenu'

type TabValue = 'todos' | 'receitas' | 'despesas'

export function EntriesPage() {
  const { accountId } = useScope()
  const { status } = useSession()
  const { scopeLabel, hasAccounts, accountsLoaded } = useAccountScope()
  const drawer = useDrawer()

  const now = today()
  const [tab, setTab] = useState<TabValue>('todos')
  const [search, setSearch] = useState('')
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PERIOD_PRESET)
  const [custom, setCustom] = useState({ start: now, end: now })
  const [categoryId, setCategoryId] = useState('')
  const [method, setMethod] = useState('')
  const [expenseMode, setExpenseMode] = useState('')

  const period = useMemo(() => buildPeriod(preset, now, custom), [preset, now, custom])
  const enabled = status === 'authenticated'

  const categories = useCategoriesQuery({ accountId }, enabled)
  const transactions = useTransactionsQuery(
    {
      accountId,
      start: period.start,
      end: period.end,
      kind: tab,
      search,
      categoryId: categoryId || null,
      method: (method || null) as PaymentMethod | null,
      expenseMode: (expenseMode || null) as ExpenseMode | null,
    },
    enabled,
  )

  const hasDetailFilters =
    tab !== 'todos' || Boolean(search.trim()) || Boolean(categoryId) || Boolean(method) || Boolean(expenseMode)
  const hasFilters = hasDetailFilters || preset !== 'tudo'

  function clearFilters() {
    setTab('todos')
    setSearch('')
    setCategoryId('')
    setMethod('')
    setExpenseMode('')
    setPreset('tudo')
  }

  return (
    <>
      <PageHeader
        title="Lançamentos"
        description={`Receitas, despesas e quitações de fatura · ${scopeLabel}`}
        actions={<NewEntryMenu disabled={!hasAccounts} />}
      />

      {accountsLoaded && !hasAccounts ? (
        <SurfaceCard>
          <NoAccounts />
        </SurfaceCard>
      ) : (
        <SurfaceCard flush>
          <div style={{ padding: 'var(--space-6) var(--space-6) 0' }}>
            <Tabs
              label="Tipo de lançamento"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'todos', label: 'Todos' },
                { value: 'receitas', label: 'Receitas' },
                { value: 'despesas', label: 'Despesas' },
              ]}
            />

            <div className="filter-bar" style={{ marginTop: 'var(--space-4)' }}>
              <div className="field field--grow">
                <TextField
                  label="Buscar por descrição"
                  value={search}
                  placeholder="Mercado, salário…"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <PeriodFilter
                preset={preset}
                onPresetChange={setPreset}
                start={custom.start}
                end={custom.end}
                onCustomChange={setCustom}
              />
              <SelectField
                label="Tipo da despesa"
                value={expenseMode}
                placeholder="Todos"
                onChange={(event) => setExpenseMode(event.target.value)}
              >
                <option value="unica">À vista</option>
                <option value="parcelada">Parcelada</option>
                <option value="recorrente">Recorrente</option>
              </SelectField>
              <SelectField
                label="Categoria"
                value={categoryId}
                placeholder="Todas"
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.accountName ? ` · ${category.accountName}` : ''}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Forma"
                value={method}
                placeholder="Todas"
                onChange={(event) => setMethod(event.target.value)}
              >
                {Object.entries(PAYMENT_METHOD_SHORT).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
            <p className="caption text-muted" style={{ marginTop: 'var(--space-2)' }}>
              Período {period.label}. A conta vem do seletor da barra lateral.
            </p>
          </div>

          <QueryBoundary query={transactions} rows={5}>
            {(data) =>
              data.items.length === 0 ? (
                hasFilters ? (
                  <EmptyState
                    icon="filter"
                    title="Nenhum resultado para os filtros"
                    description="Ajuste a busca, o período ou os filtros para ver seus lançamentos."
                    action={
                      <Button variant="secondary" onClick={clearFilters}>
                        {hasDetailFilters ? 'Limpar filtros' : 'Ver todo o histórico'}
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon="lancamentos"
                    title="Nenhum lançamento ainda"
                    description="Registre uma receita ou um gasto para começar a acompanhar seus totais."
                    action={<NewEntryMenu />}
                  />
                )
              ) : (
                <div className="table-scroll">
                  <table className="table">
                    <caption className="visually-hidden">
                      {data.total} lançamentos de {period.label} no escopo {scopeLabel}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Data</th>
                        <th scope="col">Descrição</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Categoria</th>
                        <th scope="col">Conta</th>
                        <th scope="col">Cartão</th>
                        <th scope="col" className="cell-money">
                          Valor
                        </th>
                        <th scope="col" className="cell-actions">
                          <span className="visually-hidden">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((row) => (
                        <tr key={row.id}>
                          <td className="tabular">{formatDate(row.date)}</td>
                          <td>{row.description}</td>
                          <td>
                            <Badge
                              tone={
                                row.kind === 'receita' ? 'success' : row.kind === 'pagamento' ? 'info' : 'neutral'
                              }
                            >
                              {row.kind === 'receita'
                                ? 'Receita'
                                : row.kind === 'pagamento'
                                  ? 'Pagamento de fatura'
                                  : `${expenseModeLabel(row.expenseMode, row.installmentNumber, row.installmentCount)} · ${row.method ? PAYMENT_METHOD_SHORT[row.method] : ''}`}
                            </Badge>
                          </td>
                          <td>
                            {row.categoryLabel ?? '—'}
                            {row.categoryArchived ? ' (arquivada)' : ''}
                          </td>
                          <td>{row.accountName}</td>
                          <td>{row.cardName ?? '—'}</td>
                          <td className="cell-money">
                            <Money value={row.amount} signed />
                          </td>
                          <td className="cell-actions">
                            {row.editable ? (
                              <IconButton
                                icon="edit"
                                label={`Editar ${row.description}`}
                                onClick={() =>
                                  drawer.open(
                                    row.kind === 'receita'
                                      ? { kind: 'receita', id: row.sourceId }
                                      : { kind: 'gasto', id: row.sourceId },
                                  )
                                }
                              />
                            ) : (
                              <span className="text-muted caption">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </QueryBoundary>
        </SurfaceCard>
      )}
    </>
  )
}

function expenseModeLabel(
  mode: ExpenseMode | undefined,
  installmentNumber: number | null | undefined,
  installmentCount: number | null | undefined,
): string {
  if (mode === 'parcelada') return `Parcelada ${installmentNumber ?? '—'}/${installmentCount ?? '—'}`
  if (mode === 'recorrente') return 'Recorrente'
  return 'Despesa à vista'
}
