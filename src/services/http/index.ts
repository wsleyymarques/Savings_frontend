import { createHttpClient, type HttpClient } from '../httpClient'
import { DataError } from '../errors'
import { tokenStore } from './tokenStore'
import type {
  ApiAccount,
  ApiAuthResponse,
  ApiCard,
  ApiCategory,
  ApiInvoice,
  ApiOverview,
  ApiTransaction,
  ApiUser,
} from './apiTypes'
import {
  centsToDecimal,
  decimalToCents,
  functionToApi,
  methodToApi,
  modeToApi,
  toAccountSummary,
  toCardSummary,
  toCategoryRow,
  toCreditPurchase,
  toEntryRow,
  toInvoiceSummary,
} from './mappers'
import type {
  AccountDetail,
  AccountSummary,
  CardDetail,
  InvoiceDetail,
  OverviewSummary,
  ScopeParams,
  Services,
} from '../contracts'

/**
 * Adaptador HTTP alinhado à API NestJS de `backend/` (`/api/v1`).
 *
 * Diferenças de contrato tratadas aqui, sem vazar para as páginas:
 * dinheiro em string decimal na API e centavos no frontend; enumerações em
 * inglês maiúsculo na API e em português no domínio do frontend; composições
 * que a API entrega em recursos separados (detalhe de conta, cartão e visão
 * geral) são montadas com requisições paralelas.
 */
export const ENDPOINTS = {
  register: '/auth/register',
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/users/me',
  password: '/users/me/password',
  accounts: '/accounts',
  cards: '/cards',
  categories: '/categories',
  transactions: '/transactions',
  incomes: '/transactions/incomes',
  expenses: '/transactions/expenses',
  installmentExpenses: '/transactions/expenses/installments',
  recurringExpenses: '/transactions/expenses/recurring',
  invoices: '/invoices',
  overview: '/overview',
  health: '/health',
} as const

/** Edição de lançamento ainda não existe na API (regras abertas no SDD). */
function notSupported(): never {
  throw new DataError(
    'A correção de lançamentos ainda não está disponível: as regras continuam pendentes no SDD.',
  )
}

export function createHttpServices(baseUrl: string): Services {
  const http: HttpClient = createHttpClient(baseUrl, tokenStore)

  function listAccounts(): Promise<ApiAccount[]> {
    return http.get<ApiAccount[]>(ENDPOINTS.accounts)
  }

  /** A API lista todas as contas do usuário; o escopo é aplicado aqui. */
  async function accountsInScope(params: ScopeParams): Promise<AccountSummary[]> {
    const accounts = (await listAccounts()).map(toAccountSummary)
    return params.accountId ? accounts.filter((account) => account.id === params.accountId) : accounts
  }

  function listTransactions(query: Record<string, string | undefined>): Promise<ApiTransaction[]> {
    return http.get<ApiTransaction[]>(ENDPOINTS.transactions, query)
  }

  return {
    auth: {
      async restoreSession() {
        if (!tokenStore.read()) return null
        try {
          return await http.get<ApiUser>(ENDPOINTS.me)
        } catch {
          tokenStore.clear()
          return null
        }
      },
      async signIn(input) {
        const response = await http.post<ApiAuthResponse>(ENDPOINTS.login, input)
        tokenStore.write(response.accessToken)
        return response.user
      },
      async signUp(input) {
        const response = await http.post<ApiAuthResponse>(ENDPOINTS.register, input)
        tokenStore.write(response.accessToken)
        return response.user
      },
      async signOut() {
        try {
          await http.post<void>(ENDPOINTS.logout)
        } finally {
          tokenStore.clear()
        }
      },
      updateProfile: (input) => http.patch<ApiUser>(ENDPOINTS.me, input),
      async changePassword(input) {
        await http.patch<void>(ENDPOINTS.password, input)
        // A API revoga todas as sessões; o token guardado deixa de valer.
        tokenStore.clear()
      },
    },

    overview: {
      async get(params): Promise<OverviewSummary> {
        const expenseQuery = {
          accountId: params.accountId ?? undefined,
          from: params.start,
          to: params.end,
          type: 'EXPENSE',
          categoryId: params.categoryId ?? undefined,
          paymentMethod: params.method ? methodToApi(params.method) : undefined,
          entryMode: params.expenseMode ? modeToApi(params.expenseMode) : undefined,
        }

        const [overview, accounts, cards, filteredExpenses, latest] = await Promise.all([
          http.get<ApiOverview>(ENDPOINTS.overview, {
            accountId: params.accountId ?? undefined,
            from: params.start,
            to: params.end,
          }),
          accountsInScope(params),
          http.get<ApiCard[]>(ENDPOINTS.cards, { accountId: params.accountId ?? undefined }),
          listTransactions(expenseQuery),
          listTransactions({ accountId: params.accountId ?? undefined }),
        ])

        const accountSummaries = accounts
        const categoryTotals = new Map<string, { label: string; amount: number }>()
        const methodTotals = new Map<string, { label: string; amount: number }>()

        for (const expense of filteredExpenses) {
          const amount = decimalToCents(expense.amount)
          const categoryKey = expense.categoryId ?? 'sem-categoria'
          const categoryEntry = categoryTotals.get(categoryKey) ?? {
            label: expense.category?.name ?? 'Sem categoria',
            amount: 0,
          }
          categoryEntry.amount += amount
          categoryTotals.set(categoryKey, categoryEntry)

          const methodKey = expense.paymentMethod ?? 'OUTRO'
          const methodEntry = methodTotals.get(methodKey) ?? { label: methodLabel(methodKey), amount: 0 }
          methodEntry.amount += amount
          methodTotals.set(methodKey, methodEntry)
        }

        return {
          position: {
            balance: decimalToCents(overview.position.accountsBalance),
            creditLimit: decimalToCents(overview.position.totalCreditLimit),
            creditCommitted: decimalToCents(overview.position.committedCredit),
            creditAvailable: decimalToCents(overview.position.availableCredit),
            openInvoices: decimalToCents(overview.position.unpaidInvoices),
          },
          period: {
            income: decimalToCents(overview.period.incomes),
            expense: decimalToCents(overview.period.expenses),
            result: decimalToCents(overview.period.result),
          },
          filteredExpenseTotal: [...categoryTotals.values()].reduce((total, row) => total + row.amount, 0),
          categoryBreakdown: [...categoryTotals.entries()]
            .map(([key, row]) => ({ key, label: row.label, amount: row.amount }))
            .sort((a, b) => b.amount - a.amount),
          paymentBreakdown: [...methodTotals.entries()]
            .map(([key, row]) => ({ key, label: row.label, amount: row.amount }))
            .sort((a, b) => b.amount - a.amount),
          accounts: accountSummaries,
          creditCards: cards
            .map((card) => toCardSummary(card, accountSummaries))
            .filter((card) => card.creditLimit !== null),
          latestEntries: latest.slice(0, 5).map(toEntryRow),
        }
      },
    },

    accounts: {
      list: (params) => accountsInScope(params),
      async get(id): Promise<AccountDetail> {
        const [account, accounts, transactions, cards] = await Promise.all([
          http.get<ApiAccount>(`${ENDPOINTS.accounts}/${id}`),
          listAccounts(),
          listTransactions({ accountId: id }),
          http.get<ApiCard[]>(ENDPOINTS.cards, { accountId: id }),
        ])
        const summaries = accounts.map(toAccountSummary)

        return {
          ...toAccountSummary(account),
          movements: transactions
            .filter((item) => item.paymentMethod !== 'CREDIT')
            .map(toEntryRow)
            .map((row) => ({
              id: row.id,
              date: row.date,
              description: row.description,
              method: row.method,
              kind: row.kind,
              amount: row.amount,
            })),
          creditPurchases: transactions
            .filter((item) => item.paymentMethod === 'CREDIT')
            .map(toCreditPurchase),
          cards: cards.map((card) => toCardSummary(card, summaries)),
        }
      },
      async create(input) {
        const account = await http.post<ApiAccount>(ENDPOINTS.accounts, {
          name: input.name,
          initialBalance: centsToDecimal(input.initialBalance),
          referenceDate: input.referenceDate,
        })
        return toAccountSummary(account)
      },
      async rename(id, input) {
        const account = await http.patch<ApiAccount>(`${ENDPOINTS.accounts}/${id}`, input)
        return toAccountSummary(account)
      },
    },

    transactions: {
      async list(params) {
        const items = await listTransactions({
          accountId: params.accountId ?? undefined,
          from: params.start,
          to: params.end,
          type:
            params.kind === 'receitas' ? 'INCOME' : params.kind === 'despesas' ? 'EXPENSE' : undefined,
          categoryId: params.categoryId ?? undefined,
          paymentMethod: params.method ? methodToApi(params.method) : undefined,
          entryMode: params.expenseMode ? modeToApi(params.expenseMode) : undefined,
        })

        // A API não filtra por texto; a busca por descrição é aplicada aqui.
        const search = (params.search ?? '').trim().toLowerCase()
        const rows = items
          .map(toEntryRow)
          .filter((row) => (search ? row.description.toLowerCase().includes(search) : true))

        return { items: rows, total: rows.length }
      },
      async count(params) {
        const items = await listTransactions({ accountId: params.accountId ?? undefined })
        return items.length
      },
      getIncome: notSupported,
      getExpense: notSupported,
      async createIncome(input) {
        await http.post<ApiTransaction>(ENDPOINTS.incomes, {
          accountId: input.accountId,
          description: input.description,
          amount: centsToDecimal(input.amount),
          effectiveDate: input.date,
        })
      },
      updateIncome: notSupported,
      async createExpense(input) {
        if (input.expenseMode === 'parcelada') {
          await http.post<ApiTransaction[]>(ENDPOINTS.installmentExpenses, {
            cardId: input.cardId,
            categoryId: input.categoryId,
            description: input.description,
            totalAmount: centsToDecimal(input.amount),
            installmentCount: input.installmentCount,
            purchaseDate: input.date,
          })
          return
        }
        if (input.expenseMode === 'recorrente') {
          await http.post<unknown>(ENDPOINTS.recurringExpenses, {
            cardId: input.cardId,
            categoryId: input.categoryId,
            description: input.description,
            amount: centsToDecimal(input.amount),
            startDate: input.date,
            endDate: input.recurrenceEndDate ?? undefined,
          })
          return
        }
        await http.post<ApiTransaction>(ENDPOINTS.expenses, {
          accountId: input.accountId ?? undefined,
          cardId: input.cardId ?? undefined,
          categoryId: input.categoryId,
          description: input.description,
          amount: centsToDecimal(input.amount),
          effectiveDate: input.date,
          paymentMethod: methodToApi(input.method),
        })
      },
      updateExpense: notSupported,
    },

    cards: {
      async list(params) {
        const [cards, accounts] = await Promise.all([
          http.get<ApiCard[]>(ENDPOINTS.cards, { accountId: params.accountId ?? undefined }),
          accountsInScope({ accountId: null }),
        ])
        const items = cards.map((card) => toCardSummary(card, accounts))
        const credit = items.filter((card) => card.creditLimit !== null)

        return {
          items,
          totals: {
            limit: credit.reduce((total, card) => total + (card.creditLimit ?? 0), 0),
            committed: credit.reduce((total, card) => total + card.committed, 0),
            available: credit.reduce((total, card) => total + card.available, 0),
          },
        }
      },
      async get(id): Promise<CardDetail> {
        const [card, accounts, transactions, invoices] = await Promise.all([
          http.get<ApiCard>(`${ENDPOINTS.cards}/${id}`),
          accountsInScope({ accountId: null }),
          listTransactions({ cardId: id }),
          http.get<ApiInvoice[]>(ENDPOINTS.invoices, { cardId: id }),
        ])

        return {
          ...toCardSummary(card, accounts),
          creditPurchases: transactions
            .filter((item) => item.paymentMethod === 'CREDIT')
            .map(toCreditPurchase),
          debitPurchases: transactions
            .filter((item) => item.paymentMethod === 'DEBIT')
            .map(toCreditPurchase),
          invoices: invoices.map(toInvoiceSummary),
        }
      },
      async create(input) {
        const card = await http.post<ApiCard>(ENDPOINTS.cards, {
          accountId: input.accountId,
          name: input.name,
          function: functionToApi(input.functions),
          creditLimit: input.creditLimit === null ? undefined : centsToDecimal(input.creditLimit),
          closingDay: input.closingDay ?? undefined,
          dueDay: input.dueDay ?? undefined,
          color: input.color,
        })
        return toCardSummary(card, await accountsInScope({ accountId: null }))
      },
      async update(id, input) {
        // A API aceita alterar identidade visual e nome; limite e datas
        // dependem das regras de correção ainda abertas no SDD.
        const card = await http.patch<ApiCard>(`${ENDPOINTS.cards}/${id}`, {
          name: input.name,
          color: input.color,
        })
        return toCardSummary(card, await accountsInScope({ accountId: null }))
      },
    },

    invoices: {
      async list(params) {
        const invoices = await http.get<ApiInvoice[]>(ENDPOINTS.invoices, {
          accountId: params.accountId ?? undefined,
          cardId: params.cardId ?? undefined,
          cycleMonth: params.cycleMonth ?? undefined,
        })
        return invoices.map(toInvoiceSummary)
      },
      async get(id): Promise<InvoiceDetail> {
        const invoice = await http.get<ApiInvoice>(`${ENDPOINTS.invoices}/${id}`)
        const summary = toInvoiceSummary(invoice)
        const transactions = invoice.transactions ?? []

        return {
          ...summary,
          purchases: transactions.filter((item) => item.type === 'EXPENSE').map(toCreditPurchase),
          payments:
            summary.paid > 0
              ? [
                  {
                    id: `${invoice.id}-pagamento`,
                    accountId: invoice.paymentAccountId ?? '',
                    accountName: invoice.paymentAccount?.name ?? '—',
                    date: invoice.paidAt ?? summary.dueDate,
                    amount: summary.paid,
                  },
                ]
              : [],
        }
      },
      async registerPayment(input) {
        await http.post<ApiInvoice>(`${ENDPOINTS.invoices}/${input.invoiceId}/payment`, {
          accountId: input.accountId,
          paymentDate: input.date,
        })
      },
    },

    categories: {
      async list(params) {
        // A API rejeita `includeArchived` como texto de query, então a listagem
        // traz apenas categorias ativas neste modo. O histórico continua
        // mostrando o nome da categoria arquivada nos lançamentos.
        const categories = await http.get<ApiCategory[]>(ENDPOINTS.categories, {
          accountId: params.accountId ?? undefined,
        })
        return categories.map(toCategoryRow)
      },
      async selectable(params) {
        const categories = await http.get<ApiCategory[]>(ENDPOINTS.categories, {
          accountId: params.accountId ?? undefined,
        })
        return categories.map(toCategoryRow)
      },
      async create(input) {
        const category = await http.post<ApiCategory>(ENDPOINTS.categories, {
          accountId: input.accountId,
          name: input.name,
        })
        return toCategoryRow(category)
      },
      async rename(id, input) {
        const category = await http.patch<ApiCategory>(`${ENDPOINTS.categories}/${id}`, input)
        return toCategoryRow(category)
      },
      async archive(id) {
        await http.delete<void>(`${ENDPOINTS.categories}/${id}`)
      },
    },
  }
}

function methodLabel(method: string): string {
  if (method === 'PIX') return 'Pix'
  if (method === 'BOLETO') return 'Boleto'
  if (method === 'DEBIT') return 'Débito'
  if (method === 'CREDIT') return 'Crédito'
  return 'Outro'
}
