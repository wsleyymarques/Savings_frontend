import { compareDateDesc } from '../../lib/date'
import {
  accountBalance,
  buildEntryRows,
  cardAvailable,
  cardCommitted,
  findAccount,
  findCategory,
  invoiceTotals,
} from '../../data/selectors'
import type { CivilDate } from '../../lib/date'
import type { Account, Card, Category, FinanceState, Id, Invoice } from '../../data/types'
import type {
  AccountSummary,
  CardSummary,
  CategoryRow,
  CreditPurchase,
  EntryRow,
  InvoiceSummary,
} from '../contracts'

export function toAccountSummary(state: FinanceState, account: Account): AccountSummary {
  return {
    id: account.id,
    name: account.name,
    initialBalance: account.initialBalance,
    referenceDate: account.referenceDate,
    currentBalance: accountBalance(state, account.id),
  }
}

export function toCardSummary(state: FinanceState, card: Card): CardSummary {
  const committed = cardCommitted(state, card.id)
  return {
    id: card.id,
    name: card.name,
    accountId: card.accountId,
    accountName: findAccount(state, card.accountId)?.name ?? '—',
    accountBalance: accountBalance(state, card.accountId),
    functions: card.functions,
    color: card.color,
    creditLimit: card.creditLimit,
    committed,
    available: cardAvailable(state, card),
    closingDay: card.closingDay,
    dueDay: card.dueDay,
  }
}

export function toCategoryRow(state: FinanceState, category: Category): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    origin: category.origin,
    accountId: category.accountId,
    accountName: category.accountId ? (findAccount(state, category.accountId)?.name ?? null) : null,
    archived: category.archived,
  }
}

export function toInvoiceSummary(
  state: FinanceState,
  invoice: Invoice,
  today: CivilDate,
): InvoiceSummary {
  const totals = invoiceTotals(state, invoice, today)
  return {
    id: invoice.id,
    cardId: invoice.cardId,
    cardName: state.cards.find((card) => card.id === invoice.cardId)?.name ?? 'Cartão',
    cycleMonth: `${invoice.dueDate.slice(0, 7)}-01`,
    cycleLabel: invoice.cycleLabel,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    closingDate: invoice.closingDate,
    dueDate: invoice.dueDate,
    total: totals.total,
    paid: totals.paid,
    remaining: totals.remaining,
    cycle: totals.cycle,
    payment: totals.payment,
    payable: totals.cycle === 'fechada' && totals.payment === 'nao-paga' && totals.total > 0,
  }
}

export function toEntryRows(state: FinanceState, accountIds: Id[], today: CivilDate): EntryRow[] {
  return buildEntryRows(state, accountIds, today).map((row) => {
    const expense = row.kind === 'despesa' ? state.expenses.find((item) => item.id === row.sourceId) : undefined
    return {
      ...row,
      categoryArchived: expense
        ? (findCategory(state, expense.categoryId)?.archived ?? false)
        : false,
    }
  })
}

export function toCreditPurchases(
  state: FinanceState,
  predicate: (expenseId: Id) => boolean,
): CreditPurchase[] {
  return state.expenses
    .filter((expense) => predicate(expense.id))
    .sort((a, b) => compareDateDesc(a.date, b.date))
    .map((expense) => ({
      id: expense.id,
      date: expense.date,
      description: expense.description,
      categoryName: findCategory(state, expense.categoryId)?.name ?? 'Categoria removida',
      amount: expense.amount,
    }))
}
