import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SurfaceCard } from '../../components/ui/Surface'
import { Breakdown } from '../../components/finance/Breakdown'
import { Money } from '../../components/finance/Money'
import { EmptyState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { Icon, type IconName } from '../../components/ui/Icon'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useCategoriesQuery, useOverviewQuery } from '../../services/queries'
import { buildPeriod, DEFAULT_PERIOD_PRESET, type PeriodPreset } from '../../lib/period'
import { formatDate } from '../../lib/date'
import { today } from '../../lib/today'
import { PAYMENT_METHOD_SHORT, type PaymentMethod } from '../../data/types'
import type { Cents } from '../../lib/money'
import { QueryBoundary } from '../shared/QueryBoundary'
import { PeriodFilter } from '../shared/PeriodFilter'
import { NoAccounts } from '../shared/NoAccounts'
import { NewEntryMenu } from '../shared/NewEntryMenu'

type MetricTone = 'neutral' | 'positive' | 'negative' | 'info'

interface MetricCardProps {
  label: string
  value: Cents
  icon: IconName
  caption: ReactNode
  tone?: MetricTone
  signed?: boolean
}

function MetricCard({ label, value, icon, caption, tone = 'neutral', signed = false }: MetricCardProps) {
  return (
    <article className={`overview-metric overview-metric--${tone}`}>
      <div className="overview-metric__top">
        <p className="overview-metric__label">{label}</p>
        <span className="overview-metric__icon" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="overview-metric__value">
        <Money value={value} signed={signed} />
      </p>
      <p className="overview-metric__caption">{caption}</p>
    </article>
  )
}

function SectionHeading({
  icon,
  title,
  description,
  aside,
}: {
  icon: IconName
  title: string
  description?: string
  aside?: ReactNode
}) {
  return (
    <div className="overview-section-heading">
      <div className="overview-section-heading__copy">
        <span className="overview-section-heading__icon" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h2 className="overview-section-heading__title">{title}</h2>
          {description ? <p className="overview-section-heading__description">{description}</p> : null}
        </div>
      </div>
      {aside ? <div className="overview-section-heading__aside">{aside}</div> : null}
    </div>
  )
}

export function OverviewPage() {
  const { accountId } = useScope()
  const { status } = useSession()
  const { scopeLabel, hasAccounts, accountsLoaded } = useAccountScope()
  const drawer = useDrawer()

  const now = today()
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PERIOD_PRESET)
  const [custom, setCustom] = useState({ start: now, end: now })
  const [categoryId, setCategoryId] = useState<string>('')
  const [method, setMethod] = useState<string>('')

  const period = useMemo(() => buildPeriod(preset, now, custom), [preset, now, custom])
  const enabled = status === 'authenticated'
  const categories = useCategoriesQuery({ accountId }, enabled)
  const overview = useOverviewQuery(
    {
      accountId,
      start: period.start,
      end: period.end,
      categoryId: categoryId || null,
      method: (method || null) as PaymentMethod | null,
    },
    enabled,
  )

  return (
    <>
      <PageHeader
        title="Visão geral"
        description="Seu patrimônio, movimentações e cartões em um só lugar"
        actions={<NewEntryMenu disabled={!hasAccounts} />}
      />

      {accountsLoaded && !hasAccounts ? (
        <SurfaceCard>
          <NoAccounts />
        </SurfaceCard>
      ) : (
        <QueryBoundary query={overview} rows={4}>
          {(data) => (
            <div className="overview-dashboard">
              <div className="overview-toolbar">
                <div className="overview-toolbar__scope">
                  <span className="overview-toolbar__scope-icon" aria-hidden="true">
                    <Icon name="contas" size={16} />
                  </span>
                  <span className="overview-toolbar__scope-copy">
                    <span className="overview-toolbar__eyebrow">Conta selecionada</span>
                    <strong>{scopeLabel}</strong>
                  </span>
                  <Badge tone="success"><Money value={data.position.balance} /></Badge>
                </div>
                <div className="overview-toolbar__period">
                  <PeriodFilter
                    preset={preset}
                    onPresetChange={setPreset}
                    start={custom.start}
                    end={custom.end}
                    onCustomChange={setCustom}
                  />
                </div>
              </div>

              <section className="overview-section">
                <SectionHeading
                  icon="wallet"
                  title="Posição atual do patrimônio"
                  description="Valores consolidados das contas e cartões selecionados"
                  aside={<span className="overview-live-note">Posição atualizada</span>}
                />
                <div className="overview-metrics overview-metrics--position">
                  <MetricCard
                    label="Saldo total em contas"
                    value={data.position.balance}
                    icon="contas"
                    caption={`${data.accounts.length} ${data.accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}`}
                    tone={data.position.balance < 0 ? 'negative' : 'positive'}
                  />
                  <MetricCard
                    label="Crédito total"
                    value={data.position.creditLimit}
                    icon="cartoes"
                    caption={<>Comprometido: <Money value={data.position.creditCommitted} /></>}
                    tone="info"
                  />
                  <MetricCard
                    label="Limite disponível"
                    value={data.position.creditAvailable}
                    icon="wallet"
                    caption="Crédito disponível nos cartões"
                    tone="info"
                  />
                  <MetricCard
                    label="Faturas em aberto"
                    value={data.position.openInvoices}
                    icon="faturas"
                    caption="Compras ainda não quitadas"
                    tone="negative"
                  />
                </div>
              </section>

              <section className="overview-section">
                <SectionHeading
                  icon="calendar"
                  title={`Desempenho no período · ${period.label}`}
                  description="Receitas e gastos reconhecidos pelas datas dos lançamentos"
                  aside={<span className="overview-live-note">Dados do período selecionado</span>}
                />
                <div className="overview-metrics overview-metrics--performance">
                  <MetricCard label="Total de receitas" value={data.period.income} icon="wallet" caption="Entradas recebidas no período" tone="positive" />
                  <MetricCard label="Total de gastos" value={data.period.expense} icon="faturas" caption="Despesas realizadas no período" tone="negative" />
                  <MetricCard
                    label="Resultado do período"
                    value={data.period.result}
                    icon="trending"
                    caption="Receitas menos gastos"
                    tone={data.period.result < 0 ? 'negative' : 'positive'}
                    signed
                  />
                </div>
              </section>

              <div className="overview-panels">
                <section className="overview-panel">
                  <div className="overview-panel__header">
                    <div>
                      <h2 className="overview-panel__title">Gastos por categoria</h2>
                      <p className="overview-panel__description">Distribuição das despesas do período</p>
                    </div>
                    <strong className="overview-panel__total"><Money value={data.filteredExpenseTotal} /></strong>
                  </div>
                  <div className="overview-panel__filter">
                    <SelectField label="Filtrar categoria" value={categoryId} placeholder="Todas as categorias" onChange={(event) => setCategoryId(event.target.value)}>
                      {(categories.data ?? []).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}{category.accountName ? ` · ${category.accountName}` : ''}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <Breakdown label="Gastos por categoria" rows={data.categoryBreakdown} emptyMessage="Nenhum gasto para os filtros selecionados" />
                </section>

                <section className="overview-panel">
                  <div className="overview-panel__header">
                    <div>
                      <h2 className="overview-panel__title">Forma de pagamento</h2>
                      <p className="overview-panel__description">Valores liquidados por método</p>
                    </div>
                    <Icon name="filter" size={18} aria-hidden="true" />
                  </div>
                  <div className="overview-panel__filter">
                    <SelectField label="Filtrar forma" value={method} placeholder="Todas as formas" onChange={(event) => setMethod(event.target.value)}>
                      {Object.entries(PAYMENT_METHOD_SHORT).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </SelectField>
                  </div>
                  <Breakdown label="Gastos por forma de pagamento" rows={data.paymentBreakdown} emptyMessage="Nenhum gasto para os filtros selecionados" />
                </section>
              </div>

              <div className="overview-panels">
                <section className="overview-panel">
                  <div className="overview-panel__header">
                    <div className="overview-panel__heading-with-icon">
                      <Icon name="contas" size={18} />
                      <div>
                        <h2 className="overview-panel__title">Contas cadastradas</h2>
                        <p className="overview-panel__description">Saldos disponíveis</p>
                      </div>
                    </div>
                    <Link className="overview-panel__link" to="/contas">Gerenciar <Icon name="chevron-right" size={15} /></Link>
                  </div>
                  <ul className="overview-compact-list">
                    {data.accounts.map((account) => (
                      <li key={account.id} className="overview-compact-row">
                        <span className="overview-compact-row__icon overview-compact-row__icon--account" aria-hidden="true"><Icon name="contas" size={17} /></span>
                        <span className="overview-compact-row__copy">
                          <strong>{account.name}</strong>
                          <small>Saldo desde {formatDate(account.referenceDate)}</small>
                        </span>
                        <strong className="overview-compact-row__value"><Money value={account.currentBalance} /></strong>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="overview-panel">
                  <div className="overview-panel__header">
                    <div className="overview-panel__heading-with-icon">
                      <Icon name="cartoes" size={18} />
                      <div>
                        <h2 className="overview-panel__title">Cartões de crédito</h2>
                        <p className="overview-panel__description">Limites e valores comprometidos</p>
                      </div>
                    </div>
                    <Link className="overview-panel__link" to="/cartoes">Ver cartões <Icon name="chevron-right" size={15} /></Link>
                  </div>
                  {data.creditCards.length === 0 ? (
                    <EmptyState
                      icon="cartoes"
                      title="Nenhum cartão de crédito"
                      description="Cadastre um cartão para acompanhar limite e faturas."
                      action={<Button variant="secondary" icon="plus" onClick={() => drawer.open({ kind: 'cartao' })}>Novo cartão</Button>}
                    />
                  ) : (
                    <ul className="overview-compact-list">
                      {data.creditCards.map((card) => (
                        <li key={card.id} className="overview-compact-row">
                          <span className="overview-compact-row__icon overview-compact-row__icon--card" style={{ backgroundColor: card.color }} aria-hidden="true"><Icon name="cartoes" size={17} /></span>
                          <span className="overview-compact-row__copy">
                            <strong>{card.name}</strong>
                            <small>Comprometido: <Money value={card.committed} /></small>
                          </span>
                          <strong className="overview-compact-row__value"><Money value={card.available} /><small> disponível</small></strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section className="overview-panel overview-panel--table">
                <div className="overview-panel__header">
                  <div>
                    <h2 className="overview-panel__title">Últimos lançamentos</h2>
                    <p className="overview-panel__description">Movimentações registradas recentemente</p>
                  </div>
                  <Link className="overview-panel__link" to="/lancamentos">Ver todos os lançamentos <Icon name="chevron-right" size={15} /></Link>
                </div>
                {data.latestEntries.length === 0 ? (
                  <EmptyState title="Nenhum lançamento registrado" description="Registre uma receita ou um gasto para acompanhar seus totais." action={<NewEntryMenu />} />
                ) : (
                  <div className="table-scroll">
                    <table className="table overview-table">
                      <caption className="visually-hidden">Últimos lançamentos financeiros</caption>
                      <thead>
                        <tr>
                          <th scope="col">Data</th><th scope="col">Descrição</th><th scope="col">Categoria</th><th scope="col">Conta / cartão</th><th scope="col">Forma</th><th scope="col" className="cell-money">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.latestEntries.map((row) => (
                          <tr key={row.id}>
                            <td className="tabular">{formatDate(row.date)}</td>
                            <td><strong>{row.description}</strong></td>
                            <td>{row.categoryLabel ?? '—'}</td>
                            <td>{row.cardName ?? row.accountName}</td>
                            <td>
                              <Badge tone={row.kind === 'receita' ? 'success' : row.kind === 'pagamento' ? 'info' : 'neutral'}>
                                {row.kind === 'receita' ? 'Receita' : row.kind === 'pagamento' ? 'Pagamento' : row.method ? PAYMENT_METHOD_SHORT[row.method] : 'Despesa'}
                              </Badge>
                            </td>
                            <td className="cell-money"><Money value={row.amount} signed /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </QueryBoundary>
      )}
    </>
  )
}
