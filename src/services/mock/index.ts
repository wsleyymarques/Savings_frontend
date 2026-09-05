import { isWithin } from '../../lib/date'
import { sum } from '../../lib/money'
import { DataError } from '../errors'
import {
  accountIdsInScope,
  cardHasCredit,
  categoriesInScope,
  categoryBreakdown,
  creditSummary,
  findCard,
  openInvoiceTotal,
  paymentBreakdown,
  selectableCategories,
  totalBalance,
  type AccountScope,
} from '../../data/selectors'
import { PAYMENT_METHOD_SHORT, type Id } from '../../data/types'
import type {
  AccountDetail,
  CardDetail,
  InvoiceDetail,
  OverviewSummary,
  ScopeParams,
  Services,
  TransactionList,
  TransactionListParams,
} from '../contracts'
import { MockStore } from './store'
import {
  toAccountSummary,
  toCardSummary,
  toCategoryRow,
  toCreditPurchases,
  toEntryRows,
  toInvoiceSummary,
} from './mappers'

function scopeOf(params: ScopeParams): AccountScope {
  return params.accountId ?? 'all'
}

/**
 * Adaptador mockado dos services por domínio. Deriva os mesmos DTOs que o
 * backend deverá devolver, para que a troca não exija reescrever páginas.
 */
export function createMockServices(options: { failing?: boolean } = {}): Services {
  const store = new MockStore(options)

  async function scopedIds(params: ScopeParams): Promise<{ state: ReturnType<MockStore['peek']>; ids: Id[] }> {
    const state = await store.snapshot()
    return { state, ids: accountIdsInScope(state, scopeOf(params)) }
  }

  return {
    auth: {
      restoreSession: () => store.restoreSession(),
      signIn: (input) => store.signIn(input),
      signUp: (input) => store.signUp(input),
      signOut: () => store.signOut(),
      updateProfile: ({ name }) => store.updateProfile(name),
      changePassword: (input) => store.changePassword(input),
    },

    overview: {
      async get(params): Promise<OverviewSummary> {
        const { state, ids } = await scopedIds(params)
        const credit = creditSummary(state, ids)

        const periodExpenseList = state.expenses
          .filter((expense) => ids.includes(expense.accountId))
          .filter((expense) => isWithin(expense.date, params.start, params.end))
        const income = sum(
          state.incomes
            .filter((item) => ids.includes(item.accountId))
            .filter((item) => isWithin(item.date, params.start, params.end))
            .map((item) => item.amount),
        )
        const expense = sum(periodExpenseList.map((item) => item.amount))

        const filtered = periodExpenseList.filter(
          (item) =>
            (!params.categoryId || item.categoryId === params.categoryId) &&
            (!params.method || item.method === params.method),
        )

        return {
          position: {
            balance: totalBalance(state, ids),
            creditLimit: credit.limit,
            creditCommitted: credit.committed,
            creditAvailable: credit.available,
            openInvoices: openInvoiceTotal(state, ids, store.today),
          },
          period: { income, expense, result: income - expense },
          filteredExpenseTotal: sum(filtered.map((item) => item.amount)),
          categoryBreakdown: categoryBreakdown(filtered, state),
          paymentBreakdown: paymentBreakdown(filtered).map((row) => ({
            ...row,
            label: PAYMENT_METHOD_SHORT[row.label as keyof typeof PAYMENT_METHOD_SHORT],
          })),
          accounts: state.accounts
            .filter((account) => ids.includes(account.id))
            .map((account) => toAccountSummary(state, account)),
          creditCards: state.cards
            .filter((card) => ids.includes(card.accountId) && cardHasCredit(card))
            .map((card) => toCardSummary(state, card)),
          latestEntries: toEntryRows(state, ids, store.today).slice(0, 5),
        }
      },
    },

    accounts: {
      async list(params) {
        const { state, ids } = await scopedIds(params)
        return state.accounts
          .filter((account) => ids.includes(account.id))
          .map((account) => toAccountSummary(state, account))
      },
      async get(id): Promise<AccountDetail> {
        const state = await store.snapshot()
        const account = state.accounts.find((item) => item.id === id)
        if (!account) throw new DataError('Conta não encontrada.')

        const movements = toEntryRows(state, [id], store.today)
          .filter((row) => {
            if (row.kind !== 'despesa') return true
            const expense = state.expenses.find((item) => item.id === row.sourceId)
            return expense?.method !== 'credito'
          })
          .map((row) => ({
            id: row.id,
            date: row.date,
            description: row.description,
            method: row.method,
            kind: row.kind,
            amount: row.amount,
          }))

        return {
          ...toAccountSummary(state, account),
          movements,
          creditPurchases: toCreditPurchases(state, (expenseId) => {
            const expense = state.expenses.find((item) => item.id === expenseId)
            return expense?.accountId === id && expense.method === 'credito'
          }),
          cards: state.cards
            .filter((card) => card.accountId === id)
            .map((card) => toCardSummary(state, card)),
        }
      },
      async create(input) {
        const id = await store.createAccount(input)
        const state = store.peek()
        const account = state.accounts.find((item) => item.id === id)
        if (!account) throw new DataError('Conta não encontrada após a criação.')
        return toAccountSummary(state, account)
      },
      async rename(id, { name }) {
        await store.renameAccount(id, name)
        const state = store.peek()
        const account = state.accounts.find((item) => item.id === id)
        if (!account) throw new DataError('Conta não encontrada.')
        return toAccountSummary(state, account)
      },
    },

    transactions: {
      async list(params: TransactionListParams): Promise<TransactionList> {
        const { state, ids } = await scopedIds(params)
        const search = (params.search ?? '').trim().toLowerCase()

        const items = toEntryRows(state, ids, store.today)
          .filter((row) =>
            params.kind === 'receitas'
              ? row.kind === 'receita'
              : params.kind === 'despesas'
                ? row.kind === 'despesa'
                : true,
          )
          .filter((row) => isWithin(row.date, params.start, params.end))
          .filter((row) => (search ? row.description.toLowerCase().includes(search) : true))
          .filter((row) => {
            if (!params.categoryId) return true
            if (row.kind !== 'despesa') return false
            const expense = state.expenses.find((item) => item.id === row.sourceId)
            return expense?.categoryId === params.categoryId
          })
          .filter((row) => (params.method ? row.method === params.method : true))

        return { items, total: items.length }
      },
      async count(params) {
        const { state, ids } = await scopedIds(params)
        return toEntryRows(state, ids, store.today).length
      },
      async getIncome(id) {
        const state = await store.snapshot()
        const income = state.incomes.find((item) => item.id === id)
        if (!income) throw new DataError('Receita não encontrada.')
        return {
          description: income.description,
          amount: income.amount,
          accountId: income.accountId,
          date: income.date,
        }
      },
      async getExpense(id) {
        const state = await store.snapshot()
        const expense = state.expenses.find((item) => item.id === id)
        if (!expense) throw new DataError('Despesa não encontrada.')
        return {
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          method: expense.method,
          accountId: expense.accountId,
          cardId: expense.cardId,
          categoryId: expense.categoryId,
        }
      },
      createIncome: (input) => store.createIncome(input),
      updateIncome: (id, input) => store.updateIncome(id, input),
      createExpense: (input) => store.createExpense(input),
      updateExpense: (id, input) => store.updateExpense(id, input),
    },

    cards: {
      async list(params) {
        const { state, ids } = await scopedIds(params)
        return {
          items: state.cards
            .filter((card) => ids.includes(card.accountId))
            .map((card) => toCardSummary(state, card)),
          totals: creditSummary(state, ids),
        }
      },
      async get(id): Promise<CardDetail> {
        const state = await store.snapshot()
        const card = findCard(state, id)
        if (!card) throw new DataError('Cartão não encontrado.')

        return {
          ...toCardSummary(state, card),
          creditPurchases: toCreditPurchases(state, (expenseId) => {
            const expense = state.expenses.find((item) => item.id === expenseId)
            return expense?.cardId === id && expense.method === 'credito'
          }),
          debitPurchases: toCreditPurchases(state, (expenseId) => {
            const expense = state.expenses.find((item) => item.id === expenseId)
            return expense?.cardId === id && expense.method === 'debito'
          }),
          invoices: cardHasCredit(card)
            ? state.invoices
                .filter((invoice) => invoice.cardId === id)
                .map((invoice) => toInvoiceSummary(state, invoice, store.today))
                .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
            : [],
        }
      },
      async create(input) {
        const id = await store.createCard(input)
        const state = store.peek()
        const card = findCard(state, id)
        if (!card) throw new DataError('Cartão não encontrado após a criação.')
        return toCardSummary(state, card)
      },
      async update(id, input) {
        await store.updateCard(id, input)
        const state = store.peek()
        const card = findCard(state, id)
        if (!card) throw new DataError('Cartão não encontrado.')
        return toCardSummary(state, card)
      },
    },

    invoices: {
      async list(params) {
        const { state, ids } = await scopedIds(params)
        const cardIds = state.cards
          .filter((card) => ids.includes(card.accountId) && cardHasCredit(card))
          .map((card) => card.id)

        return state.invoices
          .filter((invoice) => cardIds.includes(invoice.cardId))
          .filter((invoice) => (params.cardId ? invoice.cardId === params.cardId : true))
          .map((invoice) => toInvoiceSummary(state, invoice, store.today))
          .filter((invoice) => (params.cycleMonth ? invoice.cycleMonth === params.cycleMonth : true))
          .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
      },
      async get(id): Promise<InvoiceDetail> {
        const state = await store.snapshot()
        const invoice = state.invoices.find((item) => item.id === id)
        if (!invoice) throw new DataError('Fatura não encontrada.')

        return {
          ...toInvoiceSummary(state, invoice, store.today),
          purchases: toCreditPurchases(state, (expenseId) => {
            const expense = state.expenses.find((item) => item.id === expenseId)
            return expense?.invoiceId === id
          }),
          payments: state.invoicePayments
            .filter((payment) => payment.invoiceId === id)
            .map((payment) => ({
              id: payment.id,
              accountId: payment.accountId,
              accountName: state.accounts.find((a) => a.id === payment.accountId)?.name ?? '—',
              date: payment.date,
              amount: payment.amount,
            })),
        }
      },
      registerPayment: (input) => store.registerInvoicePayment(input),
    },

    categories: {
      async list(params) {
        const { state, ids } = await scopedIds(params)
        return categoriesInScope(state, ids).map((category) => toCategoryRow(state, category))
      },
      async selectable(params) {
        const state = await store.snapshot()
        return selectableCategories(state, params.accountId).map((category) =>
          toCategoryRow(state, category),
        )
      },
      async create(input) {
        const category = await store.createCategory(input)
        return toCategoryRow(store.peek(), category)
      },
      async rename(id, { name }) {
        const category = await store.renameCategory(id, name)
        return toCategoryRow(store.peek(), category)
      },
      archive: (id) => store.archiveCategory(id),
    },
  }
}

export { MockStore }
