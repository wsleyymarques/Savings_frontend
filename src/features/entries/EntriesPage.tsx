import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Tabs } from '../../components/ui/Tabs'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { Money } from '../../components/finance/Money'
import { Icon, type IconName } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { DropdownMenu, MenuItem, MenuSeparator } from '../../components/ui/DropdownMenu'
import { EmptyState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useCategoriesQuery, useDeleteEntryMutation, useTransactionsQuery } from '../../services/queries'
import { messageFor, type EntryRow } from '../../services'
import { useToast } from '../../components/ui/toastContext'
import { formatDate, formatDateTime, formatTime } from '../../lib/date'
import { today } from '../../lib/today'
import { buildPeriod, DEFAULT_PERIOD_PRESET, type PeriodPreset } from '../../lib/period'
import { PAYMENT_METHOD_SHORT, type ExpenseMode, type PaymentMethod } from '../../data/types'
import { QueryBoundary } from '../shared/QueryBoundary'
import { PeriodFilter } from '../shared/PeriodFilter'
import { NoAccounts } from '../shared/NoAccounts'
import { NewEntryMenu } from '../shared/NewEntryMenu'
import { CommitmentList } from './CommitmentList'
import { BillsToPay } from './BillsToPay'

type TabValue = 'todos' | 'receitas' | 'despesas' | 'compromissos' | 'contas-a-pagar'
type SortOrder = 'recentes' | 'antigos' | 'maior-valor' | 'menor-valor'

const EXPENSE_MODES: { value: ExpenseMode; label: string }[] = [
  { value: 'unica', label: 'À vista' },
  { value: 'parcelada', label: 'Parcelada' },
  { value: 'recorrente', label: 'Recorrente' },
]

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigos', label: 'Mais antigos' },
  { value: 'maior-valor', label: 'Maior valor' },
  { value: 'menor-valor', label: 'Menor valor' },
]

export function EntriesPage() {
  const { accountId } = useScope()
  const { status } = useSession()
  const { scopeLabel, hasAccounts, accountsLoaded } = useAccountScope()
  const drawer = useDrawer()
  const toast = useToast()
  const deleteEntry = useDeleteEntryMutation()

  const now = today()
  const [tab, setTab] = useState<TabValue>('todos')
  const [search, setSearch] = useState('')
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PERIOD_PRESET)
  const [custom, setCustom] = useState({ start: now, end: now })
  const [categoryId, setCategoryId] = useState('')
  const [method, setMethod] = useState('')
  const [expenseMode, setExpenseMode] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('recentes')

  const period = useMemo(() => buildPeriod(preset, now, custom), [preset, now, custom])
  const enabled = status === 'authenticated'
  const showingCommitments = tab === 'compromissos'
  const showingBills = tab === 'contas-a-pagar'
  const showingList = !showingCommitments && !showingBills

  const categories = useCategoriesQuery({ accountId }, enabled)
  const overviewTransactions = useTransactionsQuery(
    { accountId, start: period.start, end: period.end, kind: 'todos' },
    enabled && showingList,
  )
  const transactions = useTransactionsQuery(
    {
      accountId,
      start: period.start,
      end: period.end,
      kind: showingList ? tab : 'todos',
      search,
      categoryId: categoryId || null,
      method: (method || null) as PaymentMethod | null,
      expenseMode: (expenseMode || null) as ExpenseMode | null,
    },
    enabled && showingList,
  )

  const hasDetailFilters =
    tab !== 'todos' || Boolean(search.trim()) || Boolean(categoryId) || Boolean(method) || Boolean(expenseMode)
  const hasFilters = hasDetailFilters || preset !== 'tudo'

  function clearFilters() {
    setTab(tab === 'compromissos' || tab === 'contas-a-pagar' ? tab : 'todos')
    setSearch('')
    setCategoryId('')
    setMethod('')
    setExpenseMode('')
    setPreset('tudo')
    setSortOrder('recentes')
  }

  function showExpenseMode(mode: ExpenseMode) {
    setTab('despesas')
    setExpenseMode(mode)
  }

  function changeTab(nextTab: TabValue) {
    setTab(nextTab)
    if (nextTab === 'receitas') setExpenseMode('')
  }

  async function handleDelete(row: EntryRow) {
    const recurring = row.expenseMode === 'recorrente' && Boolean(row.recurringRuleId)
    const action = recurring ? 'cancelar esta recorrência' : 'excluir este lançamento'
    if (!window.confirm(`Deseja ${action}? Essa ação não pode ser desfeita.`)) return

    try {
      await deleteEntry.mutateAsync({
        id: row.sourceId,
        kind: row.kind as 'receita' | 'despesa',
        recurring,
      })
      toast.notify(recurring ? 'Recorrência cancelada' : 'Lançamento excluído')
    } catch (error) {
      toast.notifyError(messageFor(error))
    }
  }

  return (
    <>
      <PageHeader
        title="Lançamentos"
        description={`Acompanhe gastos, receitas e compromissos · ${scopeLabel}`}
        actions={
          showingCommitments || showingBills ? (
            <Button
              variant="primary"
              icon="plus"
              disabled={!hasAccounts}
              onClick={() => drawer.open({ kind: 'compromisso' })}
            >
              Novo compromisso
            </Button>
          ) : undefined
        }
      />

      {accountsLoaded && !hasAccounts ? (
        <SurfaceCard>
          <NoAccounts />
        </SurfaceCard>
      ) : (
        <div className="entries-dashboard">
          {showingList ? (
            <QueryBoundary query={overviewTransactions} rows={4}>
              {(data) => (
                <section className="entries-overview" aria-labelledby="entries-overview-title">
                  <div className="entries-section-heading">
                    <div>
                      <h2 id="entries-overview-title" className="card-title">Visão do período</h2>
                      <p className="text-secondary">Resumo de {period.label.toLowerCase()}</p>
                    </div>
                    <span className="entries-overview__count">
                      {data.total} {data.total === 1 ? 'lançamento' : 'lançamentos'}
                    </span>
                  </div>
                  <div className="entries-insights">
                    <EntryInsight
                      label="Assinaturas"
                      description="Recorrências no período"
                      icon="retry"
                      tone="info"
                      rows={data.items.filter((row) => row.kind === 'despesa' && row.expenseMode === 'recorrente')}
                      active={tab === 'despesas' && expenseMode === 'recorrente'}
                      onClick={() => showExpenseMode('recorrente')}
                    />
                    <EntryInsight
                      label="Compras parceladas"
                      description="Parcelas no período"
                      icon="cartoes"
                      tone="warning"
                      rows={data.items.filter((row) => row.kind === 'despesa' && row.expenseMode === 'parcelada')}
                      active={tab === 'despesas' && expenseMode === 'parcelada'}
                      onClick={() => showExpenseMode('parcelada')}
                    />
                    <EntryInsight
                      label="Gastos à vista"
                      description="Pagamentos únicos"
                      icon="wallet"
                      tone="neutral"
                      rows={data.items.filter(
                        (row) =>
                          row.kind === 'despesa' &&
                          (row.expenseMode === 'unica' || row.expenseMode === undefined),
                      )}
                      active={tab === 'despesas' && expenseMode === 'unica'}
                      onClick={() => showExpenseMode('unica')}
                    />
                    <EntryInsight
                      label="Receitas"
                      description="Entradas no período"
                      icon="trending"
                      tone="success"
                      rows={data.items.filter((row) => row.kind === 'receita')}
                      active={tab === 'receitas'}
                      onClick={() => {
                        setTab('receitas')
                        setExpenseMode('')
                      }}
                    />
                  </div>
                </section>
              )}
            </QueryBoundary>
          ) : null}

          <SurfaceCard
            flush={showingList}
            title={showingList ? 'Histórico de lançamentos' : undefined}
            description={showingList ? 'Consulte, filtre e gerencie suas movimentações.' : undefined}
            actions={
              showingList ? (
                <div className="entries-list-actions">
                  <Button
                    variant="secondary"
                    icon="plus"
                    disabled={!hasAccounts}
                    onClick={() => drawer.open({ kind: 'receita' })}
                  >
                    Adicionar receita
                  </Button>
                  <Button
                    variant="primary"
                    icon="plus"
                    disabled={!hasAccounts}
                    onClick={() => drawer.open({ kind: 'gasto' })}
                  >
                    Adicionar gasto
                  </Button>
                </div>
              ) : undefined
            }
          >
            <div className={showingList ? 'entries-list-controls' : 'entries-tabs-only'}>
              <Tabs
                label="Tipo de lançamento"
                value={tab}
                onChange={changeTab}
                items={[
                  { value: 'todos', label: 'Todos' },
                  { value: 'receitas', label: 'Receitas' },
                  { value: 'despesas', label: 'Despesas' },
                  { value: 'compromissos', label: 'Compromissos' },
                  { value: 'contas-a-pagar', label: 'Contas a pagar' },
                ]}
              />

              {showingList ? (
                <div className="entries-filters">
                  <div className="field field--grow">
                    <TextField
                      label="Buscar lançamento"
                      value={search}
                      placeholder="Ex.: mercado, aluguel ou salário"
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
                  {tab === 'receitas' ? null : (
                    <SelectField
                      label="Tipo de gasto"
                      value={expenseMode}
                      placeholder="Todos"
                      onChange={(event) => setExpenseMode(event.target.value)}
                    >
                      {EXPENSE_MODES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  )}
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
                  <SelectField
                    label="Ordenar por"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                  {hasFilters ? (
                    <div className="entries-filters__actions">
                      <Button variant="ghost" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {showingList ? (
              <QueryBoundary query={transactions} rows={5}>
                {(data) => {
                  const sortedItems = sortTransactions(data.items, sortOrder)
                  if (sortedItems.length === 0) {
                    return (
                      <div className="entries-empty">
                        {hasFilters ? (
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
                        )}
                      </div>
                    )
                  }

                  return (
                    <>
                      <div className="entries-result-bar">
                        <span>
                          <strong>{data.total}</strong> {data.total === 1 ? 'resultado' : 'resultados'}
                        </span>
                        <span>{period.label} · {scopeLabel}</span>
                      </div>
                      <ul className="entries-list" aria-label={`Lançamentos de ${period.label}`}>
                        {sortedItems.map((row) => (
                          <TransactionItem
                            key={row.id}
                            row={row}
                            deleting={deleteEntry.isPending}
                            onEdit={() =>
                              drawer.open(
                                row.kind === 'receita'
                                  ? { kind: 'receita', id: row.sourceId }
                                  : {
                                      kind: 'gasto',
                                      id: row.sourceId,
                                      recurringRule:
                                        row.expenseMode === 'recorrente' && Boolean(row.recurringRuleId),
                                    },
                              )
                            }
                            onDelete={() => void handleDelete(row)}
                          />
                        ))}
                      </ul>
                    </>
                  )
                }}
              </QueryBoundary>
            ) : null}
          </SurfaceCard>

          {showingCommitments ? <CommitmentList accountId={accountId} enabled={enabled} /> : null}
          {showingBills ? <BillsToPay accountId={accountId} enabled={enabled} /> : null}
        </div>
      )}
    </>
  )
}

function EntryInsight({
  label,
  description,
  icon,
  tone,
  rows,
  active,
  onClick,
}: {
  label: string
  description: string
  icon: IconName
  tone: 'neutral' | 'success' | 'warning' | 'info'
  rows: EntryRow[]
  active: boolean
  onClick: () => void
}) {
  const total = rows.reduce((sum, row) => sum + Math.abs(row.amount), 0)
  return (
    <button
      type="button"
      className={`entry-insight entry-insight--${tone}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="entry-insight__top">
        <span className="entry-insight__label">{label}</span>
        <span className="entry-insight__icon" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
      </span>
      <span className="entry-insight__value"><Money value={total} /></span>
      <span className="entry-insight__description">
        {rows.length} {rows.length === 1 ? 'item' : 'itens'} · {description}
      </span>
    </button>
  )
}

function TransactionItem({
  row,
  deleting,
  onEdit,
  onDelete,
}: {
  row: EntryRow
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const type = entryType(row)
  const time = row.projected ? '' : formatTime(row.createdAt)

  return (
    <li className="entry-item">
      <div className={`entry-item__icon entry-item__icon--${type.tone}`} aria-hidden="true">
        <Icon name={type.icon} size={19} />
      </div>
      <div className="entry-item__content">
        <div className="entry-item__heading">
          <div className="entry-item__title-group">
            <strong className="entry-item__title">{row.description}</strong>
            <div className="entry-item__badges">
              <Badge tone={type.badgeTone}>{type.label}</Badge>
              {row.projected ? <Badge tone="info">Previsto</Badge> : null}
            </div>
          </div>
          <strong className="entry-item__amount"><Money value={row.amount} signed /></strong>
        </div>

        <div className="entry-item__meta" title={`Cadastrado em ${formatDateTime(row.createdAt)}`}>
          <span><b>Data</b> {formatDate(row.date)}{time ? ` às ${time}` : ''}</span>
          <span><b>Categoria</b> {row.categoryLabel ?? 'Sem categoria'}{row.categoryArchived ? ' (arquivada)' : ''}</span>
          <span><b>Conta</b> {row.accountName}</span>
          {row.cardName ? <span><b>Cartão</b> {row.cardName}</span> : null}
          {row.method ? <span><b>Forma</b> {PAYMENT_METHOD_SHORT[row.method]}</span> : null}
          {row.beneficiaryName ? <span><b>Para</b> {row.beneficiaryName}</span> : null}
        </div>
      </div>

      <div className="entry-item__actions">
        {row.editable ? (
          <DropdownMenu
            label={`Opções de ${row.description}`}
            align="end"
            placement="top"
            trigger={({ ref, ...props }) => (
              <IconButton
                ref={ref}
                icon="more"
                label={`Opções de ${row.description}`}
                {...props}
              />
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  onClick={() => {
                    close()
                    onEdit()
                  }}
                >
                  {row.expenseMode === 'recorrente' ? 'Editar recorrência' : 'Editar'}
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  disabled={deleting}
                  onClick={() => {
                    close()
                    onDelete()
                  }}
                >
                  {row.expenseMode === 'recorrente' ? 'Cancelar recorrência' : 'Excluir'}
                </MenuItem>
              </>
            )}
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  )
}

function entryType(row: EntryRow): {
  label: string
  icon: IconName
  tone: 'positive' | 'negative' | 'info' | 'neutral'
  badgeTone: BadgeTone
} {
  if (row.kind === 'receita') {
    return { label: 'Receita', icon: 'trending', tone: 'positive', badgeTone: 'success' }
  }
  if (row.kind === 'pagamento') {
    return { label: 'Pagamento de fatura', icon: 'faturas', tone: 'info', badgeTone: 'info' }
  }
  if (row.expenseMode === 'recorrente') {
    return { label: 'Assinatura recorrente', icon: 'retry', tone: 'info', badgeTone: 'info' }
  }
  if (row.expenseMode === 'parcelada') {
    return {
      label: `Parcela ${row.installmentNumber ?? '—'}/${row.installmentCount ?? '—'}`,
      icon: 'cartoes',
      tone: 'negative',
      badgeTone: 'warning',
    }
  }
  return {
    label: row.method ? `Gasto · ${PAYMENT_METHOD_SHORT[row.method]}` : 'Gasto',
    icon: 'wallet',
    tone: 'negative',
    badgeTone: 'neutral',
  }
}

function sortTransactions(items: EntryRow[], order: SortOrder): EntryRow[] {
  return [...items].sort((left, right) => {
    if (order === 'maior-valor') return Math.abs(right.amount) - Math.abs(left.amount)
    if (order === 'menor-valor') return Math.abs(left.amount) - Math.abs(right.amount)
    const dateOrder = left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt)
    return order === 'antigos' ? dateOrder : -dateOrder
  })
}
