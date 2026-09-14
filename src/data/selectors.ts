import { sum, type Cents } from '../lib/money'
import {
  addMonths,
  compareDateDesc,
  daysInMonth,
  isWithin,
  monthLabelFrom,
  toCivilDate,
  type CivilDate,
} from '../lib/date'
import type {
  Account,
  Card,
  Category,
  Expense,
  FinanceState,
  Id,
  Invoice,
  PaymentMethod,
} from './types'

export type AccountScope = 'all' | Id

export interface Period {
  start: CivilDate
  end: CivilDate
  label: string
}

export function accountIdsInScope(state: FinanceState, scope: AccountScope): Id[] {
  if (scope === 'all') return state.accounts.map((account) => account.id)
  return state.accounts.some((account) => account.id === scope) ? [scope] : []
}

export function findAccount(state: FinanceState, id: Id | null): Account | undefined {
  return state.accounts.find((account) => account.id === id)
}

export function findCard(state: FinanceState, id: Id | null): Card | undefined {
  return state.cards.find((card) => card.id === id)
}

export function findCategory(state: FinanceState, id: Id | null): Category | undefined {
  return state.categories.find((category) => category.id === id)
}

export function findInvoice(state: FinanceState, id: Id | null): Invoice | undefined {
  return state.invoices.find((invoice) => invoice.id === id)
}

export function cardHasCredit(card: Card): boolean {
  return card.functions === 'credito' || card.functions === 'ambas'
}

export function cardHasDebit(card: Card): boolean {
  return card.functions === 'debito' || card.functions === 'ambas'
}

/* ------------------------------------------------------------------ */
/* Saldo — SDD 5.1                                                     */
/* ------------------------------------------------------------------ */

/** Despesas que retiram dinheiro da conta no momento do registro. */
export function isDirectExpense(expense: Expense): boolean {
  return expense.method !== 'credito'
}

export function accountBalance(state: FinanceState, accountId: Id): Cents {
  const account = findAccount(state, accountId)
  if (!account) return 0

  const incomes = sum(
    state.incomes.filter((income) => income.accountId === accountId).map((income) => income.amount),
  )
  const direct = sum(
    state.expenses
      .filter((expense) => expense.accountId === accountId && isDirectExpense(expense))
      .map((expense) => expense.amount),
  )
  const payments = sum(
    state.invoicePayments
      .filter((payment) => payment.accountId === accountId)
      .map((payment) => payment.amount),
  )

  return account.initialBalance + incomes - direct - payments
}

export function totalBalance(state: FinanceState, accountIds: Id[]): Cents {
  return sum(accountIds.map((id) => accountBalance(state, id)))
}

/* ------------------------------------------------------------------ */
/* Crédito — SDD 5.2                                                   */
/* ------------------------------------------------------------------ */

/** Crédito ainda comprometido: compras no crédito menos quitações do cartão. */
export function cardCommitted(state: FinanceState, cardId: Id): Cents {
  const purchases = sum(
    state.expenses
      .filter((expense) => expense.cardId === cardId && expense.method === 'credito')
      .map((expense) => expense.amount),
  )
  const invoiceIds = state.invoices
    .filter((invoice) => invoice.cardId === cardId)
    .map((invoice) => invoice.id)
  const paid = sum(
    state.invoicePayments
      .filter((payment) => invoiceIds.includes(payment.invoiceId))
      .map((payment) => payment.amount),
  )
  return Math.max(0, purchases - paid)
}

export function cardAvailable(state: FinanceState, card: Card): Cents {
  if (!cardHasCredit(card) || card.creditLimit === null) return 0
  return Math.max(0, card.creditLimit - cardCommitted(state, card.id))
}

export interface CreditSummary {
  limit: Cents
  committed: Cents
  available: Cents
}

export function creditSummary(state: FinanceState, accountIds: Id[]): CreditSummary {
  const cards = state.cards.filter(
    (card) => accountIds.includes(card.accountId) && cardHasCredit(card) && card.creditLimit !== null,
  )
  const limit = sum(cards.map((card) => card.creditLimit ?? 0))
  const committed = sum(cards.map((card) => cardCommitted(state, card.id)))
  return { limit, committed, available: Math.max(0, limit - committed) }
}

/* ------------------------------------------------------------------ */
/* Faturas — SDD 4.6                                                   */
/* ------------------------------------------------------------------ */

export type CycleStatus = 'aberta' | 'fechada'
export type PaymentStatus = 'paga' | 'nao-paga'

export interface InvoiceTotals {
  total: Cents
  paid: Cents
  remaining: Cents
  cycle: CycleStatus
  payment: PaymentStatus
}

export function invoiceTotals(state: FinanceState, invoice: Invoice, today: CivilDate): InvoiceTotals {
  const total = sum(
    state.expenses
      .filter((expense) => expense.invoiceId === invoice.id)
      .map((expense) => expense.amount),
  )
  const paid = sum(
    state.invoicePayments
      .filter((payment) => payment.invoiceId === invoice.id)
      .map((payment) => payment.amount),
  )
  const remaining = Math.max(0, total - paid)
  return {
    total,
    paid,
    remaining,
    cycle: today >= invoice.closingDate ? 'fechada' : 'aberta',
    payment: total > 0 && remaining === 0 ? 'paga' : 'nao-paga',
  }
}

/** Soma o saldo das faturas cujos ciclos ainda recebem compras. */
export function openInvoiceTotal(
  state: FinanceState,
  accountIds: Id[],
  today: CivilDate,
): Cents {
  return sum(
    state.cards
      .filter((card) => accountIds.includes(card.accountId) && cardHasCredit(card))
      .map((card) => {
        const currentCycle = resolveInvoiceCycle(card, today)
        const invoice = state.invoices.find(
          (item) => item.cardId === card.id && item.closingDate === currentCycle.closingDate,
        )
        return invoice ? invoiceTotals(state, invoice, today).remaining : 0
      }),
  )
}

/** Soma o saldo das faturas não pagas que já venceram. */
export function overdueInvoiceTotal(
  state: FinanceState,
  accountIds: Id[],
  today: CivilDate,
): Cents {
  const cardIds = state.cards
    .filter((card) => accountIds.includes(card.accountId))
    .map((card) => card.id)
  return sum(
    state.invoices
      .filter((invoice) => cardIds.includes(invoice.cardId) && invoice.dueDate < today)
      .map((invoice) => invoiceTotals(state, invoice, today).remaining),
  )
}

/**
 * Ciclo de uma compra: primeiro fechamento igual ou posterior à data da compra.
 * A regra definitiva do SDD (CA-09) ainda está pendente; esta é a opção simples registrada.
 */
export function resolveInvoiceCycle(
  card: { closingDay: number | null; dueDay: number | null },
  purchaseDate: CivilDate,
) {
  const closingDay = card.closingDay ?? 1
  const dueDay = card.dueDay ?? closingDay
  const [year, month] = purchaseDate.split('-').map(Number)

  let closing = clampedDate(year, month, closingDay)
  if (closing < purchaseDate) closing = addMonths(clampedDate(year, month, closingDay), 1)

  const previousClosing = addMonths(closing, -1)
  const periodStart = nextDay(previousClosing)

  const [closingYear, closingMonth] = closing.split('-').map(Number)
  let due = clampedDate(closingYear, closingMonth, dueDay)
  if (due <= closing) due = addMonths(clampedDate(closingYear, closingMonth, dueDay), 1)

  const [dueYear, dueMonth] = due.split('-').map(Number)

  return {
    cycleLabel: monthLabelFrom(dueYear, dueMonth),
    periodStart,
    periodEnd: closing,
    closingDate: closing,
    dueDate: due,
  }
}

function clampedDate(year: number, month: number, day: number): CivilDate {
  return toCivilDate(year, month, Math.min(day, daysInMonth(year, month)))
}

function nextDay(value: CivilDate): CivilDate {
  const [year, month, day] = value.split('-').map(Number)
  if (day < daysInMonth(year, month)) return toCivilDate(year, month, day + 1)
  if (month === 12) return toCivilDate(year + 1, 1, 1)
  return toCivilDate(year, month + 1, 1)
}

/* ------------------------------------------------------------------ */
/* Categorias — SDD 4.7                                                */
/* ------------------------------------------------------------------ */

export function normalizeCategoryName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Categorias que podem ser escolhidas em um gasto daquela conta. */
export function selectableCategories(state: FinanceState, accountId: Id | null): Category[] {
  return state.categories
    .filter((category) => !category.archived)
    .filter(
      (category) =>
        category.origin === 'padrao' ||
        // Personalizada sem conta vale em todas; com conta, só naquela.
        category.accountId === null ||
        (accountId !== null && category.accountId === accountId),
    )
    .sort(sortCategories)
}

export function categoriesInScope(state: FinanceState, accountIds: Id[]): Category[] {
  return state.categories
    .filter(
      (category) =>
        category.origin === 'padrao' ||
        category.accountId === null ||
        accountIds.includes(category.accountId),
    )
    .sort(sortCategories)
}

function sortCategories(a: Category, b: Category): number {
  if (a.origin !== b.origin) return a.origin === 'padrao' ? -1 : 1
  return a.name.localeCompare(b.name, 'pt-BR')
}

export function isCategoryValidForAccount(category: Category | undefined, accountId: Id | null): boolean {
  if (!category) return false
  if (category.archived) return false
  if (category.origin === 'padrao') return true
  if (category.accountId === null) return true
  return category.accountId === accountId
}

/* ------------------------------------------------------------------ */
/* Movimentações do período — SDD 5.3                                  */
/* ------------------------------------------------------------------ */

export function expensesInScope(state: FinanceState, accountIds: Id[]): Expense[] {
  return state.expenses.filter((expense) => accountIds.includes(expense.accountId))
}

export function periodExpenses(state: FinanceState, accountIds: Id[], period: Period): Expense[] {
  return expensesInScope(state, accountIds).filter((expense) =>
    isWithin(expense.date, period.start, period.end),
  )
}

export function periodIncomeTotal(state: FinanceState, accountIds: Id[], period: Period): Cents {
  return sum(
    state.incomes
      .filter((income) => accountIds.includes(income.accountId))
      .filter((income) => isWithin(income.date, period.start, period.end))
      .map((income) => income.amount),
  )
}

export function periodExpenseTotal(state: FinanceState, accountIds: Id[], period: Period): Cents {
  return sum(periodExpenses(state, accountIds, period).map((expense) => expense.amount))
}

export interface BreakdownRow {
  key: string
  label: string
  detail?: string
  amount: Cents
}

export function categoryBreakdown(expenses: Expense[], state: FinanceState): BreakdownRow[] {
  const totals = new Map<string, Cents>()
  for (const expense of expenses) {
    totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount)
  }
  return [...totals.entries()]
    .map(([categoryId, amount]) => {
      const category = findCategory(state, categoryId)
      const account = category?.accountId ? findAccount(state, category.accountId) : undefined
      return {
        key: categoryId,
        label: category?.name ?? 'Categoria removida',
        detail: account?.name,
        amount,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export function paymentBreakdown(expenses: Expense[]): BreakdownRow[] {
  const order: PaymentMethod[] = ['pix', 'boleto', 'debito', 'credito']
  const totals = new Map<PaymentMethod, Cents>()
  for (const expense of expenses) {
    totals.set(expense.method, (totals.get(expense.method) ?? 0) + expense.amount)
  }
  return order
    .filter((method) => totals.has(method))
    .map((method) => ({ key: method, label: method, amount: totals.get(method) ?? 0 }))
}

/* ------------------------------------------------------------------ */
/* Lista unificada de lançamentos — design.md 7.2                       */
/* ------------------------------------------------------------------ */

export type EntryKind = 'receita' | 'despesa' | 'pagamento'

export interface EntryRow {
  id: Id
  kind: EntryKind
  sourceId: Id
  date: CivilDate
  description: string
  categoryLabel: string | null
  accountName: string
  cardName: string | null
  method: PaymentMethod | null
  /** Positivo em receitas, negativo em saídas de dinheiro e compras no crédito. */
  amount: Cents
  editable: boolean
}

export function buildEntryRows(
  state: FinanceState,
  accountIds: Id[],
  today: CivilDate,
): EntryRow[] {
  const rows: EntryRow[] = []

  for (const income of state.incomes) {
    if (!accountIds.includes(income.accountId)) continue
    rows.push({
      id: `receita-${income.id}`,
      kind: 'receita',
      sourceId: income.id,
      date: income.date,
      description: income.description,
      categoryLabel: null,
      accountName: findAccount(state, income.accountId)?.name ?? '—',
      cardName: null,
      method: null,
      amount: income.amount,
      editable: true,
    })
  }

  for (const expense of state.expenses) {
    if (!accountIds.includes(expense.accountId)) continue
    const invoice = findInvoice(state, expense.invoiceId)
    const invoicePaid = invoice ? invoiceTotals(state, invoice, today).payment === 'paga' : false
    rows.push({
      id: `despesa-${expense.id}`,
      kind: 'despesa',
      sourceId: expense.id,
      date: expense.date,
      description: expense.description,
      categoryLabel: findCategory(state, expense.categoryId)?.name ?? 'Categoria removida',
      accountName: findAccount(state, expense.accountId)?.name ?? '—',
      cardName: findCard(state, expense.cardId)?.name ?? null,
      method: expense.method,
      amount: -expense.amount,
      // Regras de correção de compra em fatura paga continuam pendentes no SDD.
      editable: !invoicePaid,
    })
  }

  for (const payment of state.invoicePayments) {
    if (!accountIds.includes(payment.accountId)) continue
    const invoice = findInvoice(state, payment.invoiceId)
    const card = invoice ? findCard(state, invoice.cardId) : undefined
    rows.push({
      id: `pagamento-${payment.id}`,
      kind: 'pagamento',
      sourceId: payment.id,
      date: payment.date,
      description: `Pagamento da fatura ${invoice?.cycleLabel ?? ''}`.trim(),
      categoryLabel: null,
      accountName: findAccount(state, payment.accountId)?.name ?? '—',
      cardName: card?.name ?? null,
      method: null,
      amount: -payment.amount,
      editable: false,
    })
  }

  return rows.sort((a, b) => compareDateDesc(a.date, b.date) || a.description.localeCompare(b.description, 'pt-BR'))
}
