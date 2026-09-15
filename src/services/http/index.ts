import { createHttpClient, type HttpClient } from '../httpClient'
import { tokenStore } from './tokenStore'
import type {
  ApiAccount,
  ApiAuthResponse,
  ApiCard,
  ApiCategory,
  ApiInvoice,
  ApiOverview,
  ApiPlannedExpense,
  ApiPlanningSimulation,
  ApiPersonalCommitment,
  ApiCommitmentOccurrence,
  ApiRecurringExpenseRule,
  ApiTransaction,
  ApiUser,
  ApiWishItem,
  ApiGoalCycleResult,
  ApiGoalCycleRow,
  ApiGoalObjective,
  ApiGoalProgressEntry,
  ApiHabitDay,
  ApiHabitDefinition,
  ApiHabitStats,
} from './apiTypes'
import {
  centsToDecimal,
  decimalToCents,
  functionToApi,
  methodFromApi,
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
  EntryRow,
  GoalCycleDetail,
  GoalCycleInput,
  GoalCycleSummary,
  GoalObjectiveInput,
  HabitDailyItem,
  HabitDefinition,
  HabitStats,
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
  wishes: '/planning/wishes',
  plannedExpenses: '/planning/planned-expenses',
  commitments: '/planning/commitments',
  commitmentOccurrences: '/planning/commitment-occurrences',
  planningSimulation: '/planning/simulation',
  goalCycles: '/goals/cycles',
  goalObjectives: '/goals/objectives',
  goalProgress: '/goals/progress',
  habits: '/habits',
  health: '/health',
} as const

/**
 * Ordem única das listagens: data do lançamento decrescente e, no mesmo dia,
 * a data e hora do cadastro — o último registrado aparece primeiro.
 */
function byDateThenCreatedAt(a: EntryRow, b: EntryRow): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
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
          listTransactions({
            accountId: params.accountId ?? undefined,
            from: params.start,
            to: params.end,
          }),
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
            openInvoices: decimalToCents(
              overview.position.openInvoices ?? overview.position.unpaidInvoices,
            ),
            overdueInvoices: decimalToCents(overview.position.overdueInvoices ?? '0'),
          },
          period: {
            income: decimalToCents(overview.period.incomes),
            expense: decimalToCents(overview.period.expenses),
            realizedExpense: decimalToCents(
              overview.period.realizedExpenses ?? overview.period.expenses,
            ),
            projectedExpense: decimalToCents(overview.period.projectedExpenses),
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
          latestEntries: latest.map(toEntryRow).sort(byDateThenCreatedAt).slice(0, 5),
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
            .sort(byDateThenCreatedAt)
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
          .sort(byDateThenCreatedAt)

        return { items: rows, total: rows.length }
      },
      async count(params) {
        const items = await listTransactions({ accountId: params.accountId ?? undefined })
        return items.length
      },
      async getIncome(id) {
        const item = await http.get<ApiTransaction>(`${ENDPOINTS.incomes}/${id}`)
        return {
          description: item.description,
          amount: decimalToCents(item.amount),
          accountId: item.accountId,
          date: item.effectiveDate,
        }
      },
      async getExpense(id) {
        const item = await http.get<ApiTransaction>(`${ENDPOINTS.expenses}/${id}`)
        return {
          description: item.description,
          amount: decimalToCents(item.amount),
          date: item.effectiveDate,
          method: methodFromApi(item.paymentMethod) ?? 'pix',
          accountId: item.accountId,
          cardId: item.cardId,
          categoryId: item.categoryId,
          expenseMode: 'unica',
          installmentCount: item.installmentCount ?? undefined,
          recurrenceEndDate: null,
        }
      },
      async createIncome(input) {
        await http.post<ApiTransaction>(ENDPOINTS.incomes, {
          accountId: input.accountId,
          description: input.description,
          amount: centsToDecimal(input.amount),
          effectiveDate: input.date,
        })
      },
      async updateIncome(id, input) {
        await http.patch<ApiTransaction>(`${ENDPOINTS.incomes}/${id}`, {
          accountId: input.accountId,
          description: input.description,
          amount: centsToDecimal(input.amount),
          effectiveDate: input.date,
        })
      },
      async deleteIncome(id) {
        await http.delete<void>(`${ENDPOINTS.incomes}/${id}`)
      },
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
      async updateExpense(id, input) {
        await http.patch<ApiTransaction>(`${ENDPOINTS.expenses}/${id}`, {
          accountId: input.accountId ?? undefined,
          cardId: input.cardId ?? undefined,
          categoryId: input.categoryId,
          description: input.description,
          amount: centsToDecimal(input.amount),
          effectiveDate: input.date,
          paymentMethod: methodToApi(input.method),
        })
      },
      async deleteExpense(id) {
        await http.delete<void>(`${ENDPOINTS.expenses}/${id}`)
      },
      async getRecurringExpense(id) {
        const rule = await http.get<ApiRecurringExpenseRule>(`${ENDPOINTS.recurringExpenses}/${id}`)
        return {
          description: rule.description,
          amount: decimalToCents(rule.amount),
          date: rule.nextOccurrenceDate,
          method: 'credito',
          accountId: null,
          cardId: rule.cardId,
          categoryId: rule.categoryId,
          expenseMode: 'recorrente',
          recurrenceEndDate: rule.endDate,
        }
      },
      async updateRecurringExpense(id, input) {
        await http.patch<ApiRecurringExpenseRule>(`${ENDPOINTS.recurringExpenses}/${id}`, {
          cardId: input.cardId,
          categoryId: input.categoryId,
          description: input.description,
          amount: centsToDecimal(input.amount),
          startDate: input.date,
          endDate: input.recurrenceEndDate ?? undefined,
        })
      },
      async cancelRecurringExpense(id) {
        await http.delete<void>(`${ENDPOINTS.recurringExpenses}/${id}`)
      },
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

        // Cada quitação, integral ou parcial, é um lançamento da fatura.
        const paymentRows = transactions
          .filter((item) => item.type === 'INVOICE_PAYMENT')
          .map((item) => ({
            id: item.id,
            accountId: item.accountId,
            accountName: item.account?.name ?? invoice.paymentAccount?.name ?? '—',
            date: item.effectiveDate,
            amount: decimalToCents(item.amount),
          }))
          .sort((a, b) => b.date.localeCompare(a.date))

        return {
          ...summary,
          purchases: transactions.filter((item) => item.type === 'EXPENSE').map(toCreditPurchase),
          payments:
            paymentRows.length > 0 || summary.paid <= 0
              ? paymentRows
              : [
                  {
                    id: `${invoice.id}-pagamento`,
                    accountId: invoice.paymentAccountId ?? '',
                    accountName: invoice.paymentAccount?.name ?? '—',
                    date: invoice.paidAt ?? summary.dueDate,
                    amount: summary.paid,
                  },
                ],
        }
      },
      async registerPayment(input) {
        await http.post<ApiInvoice>(`${ENDPOINTS.invoices}/${input.invoiceId}/payment`, {
          accountId: input.accountId,
          paymentDate: input.date,
          amount: input.amount === null || input.amount === undefined
            ? undefined
            : centsToDecimal(input.amount),
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
        // Sem conta a API cria a categoria disponível em todas elas.
        const category = await http.post<ApiCategory>(ENDPOINTS.categories, {
          accountId: input.accountId ?? undefined,
          name: input.name,
        })
        return toCategoryRow(category)
      },
      async rename(id, input) {
        const category = await http.patch<ApiCategory>(`${ENDPOINTS.categories}/${id}`, {
          name: input.name,
          accountId: input.accountId,
        })
        return toCategoryRow(category)
      },
      async archive(id) {
        await http.delete<void>(`${ENDPOINTS.categories}/${id}`)
      },
    },

    planning: {
      async listWishes() {
        return (await http.get<ApiWishItem[]>(ENDPOINTS.wishes)).map(toWishItem)
      },
      async getWish(id) {
        return toWishItem(await http.get<ApiWishItem>(`${ENDPOINTS.wishes}/${id}`))
      },
      async createWish(input) {
        return toWishItem(await http.post<ApiWishItem>(ENDPOINTS.wishes, wishPayload(input)))
      },
      async updateWish(id, input) {
        return toWishItem(
          await http.patch<ApiWishItem>(`${ENDPOINTS.wishes}/${id}`, wishPayload(input)),
        )
      },
      async archiveWish(id) {
        await http.delete<void>(`${ENDPOINTS.wishes}/${id}`)
      },
      async listPlannedExpenses(params) {
        const rows = await http.get<ApiPlannedExpense[]>(ENDPOINTS.plannedExpenses, {
          accountId: params.accountId ?? undefined,
        })
        return rows.map(toPlannedExpense)
      },
      async getPlannedExpense(id) {
        return toPlannedExpense(
          await http.get<ApiPlannedExpense>(`${ENDPOINTS.plannedExpenses}/${id}`),
        )
      },
      async createPlannedExpense(input) {
        return toPlannedExpense(
          await http.post<ApiPlannedExpense>(ENDPOINTS.plannedExpenses, plannedExpensePayload(input)),
        )
      },
      async updatePlannedExpense(id, input) {
        return toPlannedExpense(
          await http.patch<ApiPlannedExpense>(
            `${ENDPOINTS.plannedExpenses}/${id}`,
            plannedExpensePayload(input),
          ),
        )
      },
      async cancelPlannedExpense(id) {
        await http.delete<void>(`${ENDPOINTS.plannedExpenses}/${id}`)
      },
      async realizePlannedExpense(id, input) {
        return toPlannedExpense(
          await http.post<ApiPlannedExpense>(`${ENDPOINTS.plannedExpenses}/${id}/realize`, {
            purchaseDate: input.purchaseDate,
            actualAmount:
              input.actualAmount === undefined ? undefined : centsToDecimal(input.actualAmount),
          }),
        )
      },
      async listCommitments(params) {
        const rows = await http.get<ApiPersonalCommitment[]>(ENDPOINTS.commitments, {
          accountId: params.accountId ?? undefined,
        })
        return rows.map(toPersonalCommitment)
      },
      async getCommitment(id) {
        return toPersonalCommitment(
          await http.get<ApiPersonalCommitment>(`${ENDPOINTS.commitments}/${id}`),
        )
      },
      async createCommitment(input) {
        return toPersonalCommitment(
          await http.post<ApiPersonalCommitment>(ENDPOINTS.commitments, commitmentPayload(input)),
        )
      },
      async updateCommitment(id, input) {
        return toPersonalCommitment(
          await http.patch<ApiPersonalCommitment>(
            `${ENDPOINTS.commitments}/${id}`,
            commitmentPayload(input),
          ),
        )
      },
      async pauseCommitment(id) {
        return toPersonalCommitment(
          await http.post<ApiPersonalCommitment>(`${ENDPOINTS.commitments}/${id}/pause`, {}),
        )
      },
      async resumeCommitment(id) {
        return toPersonalCommitment(
          await http.post<ApiPersonalCommitment>(`${ENDPOINTS.commitments}/${id}/resume`, {}),
        )
      },
      async cancelCommitment(id) {
        await http.delete<void>(`${ENDPOINTS.commitments}/${id}`)
      },
      async listCommitmentOccurrences(params) {
        const rows = await http.get<ApiCommitmentOccurrence[]>(ENDPOINTS.commitmentOccurrences, {
          accountId: params.accountId ?? undefined,
          from: params.start,
          to: params.end,
        })
        return rows.map((item) => ({
          ...item,
          amount: decimalToCents(item.amount),
          status: item.status === 'PAID'
            ? 'pago' as const
            : item.status === 'OVERDUE'
              ? 'atrasado' as const
              : 'previsto' as const,
        }))
      },
      async registerCommitmentPayment(id, scheduledDate, input) {
        await http.post(`${ENDPOINTS.commitments}/${id}/occurrences/${scheduledDate}/pay`, {
          paymentDate: input.paymentDate,
          actualAmount: input.actualAmount === undefined ? undefined : centsToDecimal(input.actualAmount),
        })
      },
      async simulate(params) {
        const simulation = await http.get<ApiPlanningSimulation>(ENDPOINTS.planningSimulation, {
          accountId: params.accountId ?? undefined,
        })
        return {
          selectedCount: simulation.selectedCount,
          totalPlanned: decimalToCents(simulation.totalPlanned),
          currentBalance: decimalToCents(simulation.currentBalance),
          balanceAfterPurchases: decimalToCents(simulation.balanceAfterPurchases),
          balanceAfterAllPayments: decimalToCents(simulation.balanceAfterAllPayments),
          accounts: simulation.accounts.map((account) => ({
            ...account,
            currentBalance: decimalToCents(account.currentBalance),
            immediateOutflow: decimalToCents(account.immediateOutflow),
            futureCardPayments: decimalToCents(account.futureCardPayments),
            balanceAfterPurchases: decimalToCents(account.balanceAfterPurchases),
            balanceAfterAllPayments: decimalToCents(account.balanceAfterAllPayments),
          })),
          cards: simulation.cards.map((card) => ({
            ...card,
            currentAvailable:
              card.currentAvailable === null ? null : decimalToCents(card.currentAvailable),
            plannedCommitment: decimalToCents(card.plannedCommitment),
            projectedAvailable:
              card.projectedAvailable === null ? null : decimalToCents(card.projectedAvailable),
          })),
          timeline: simulation.timeline.map((item) => ({
            ...item,
            amount: decimalToCents(item.amount),
            kind: item.kind === 'PURCHASE' ? 'compra' as const : 'pagamento-cartao' as const,
          })),
          warnings: simulation.warnings,
        }
      },
    },

    goals: {
      async listCycles() {
        const rows = await http.get<ApiGoalCycleRow[]>(ENDPOINTS.goalCycles)
        return rows.map((row) => toCycleSummary(row.cycle, row.summary))
      },
      async getCycle(id) {
        const result = await http.get<ApiGoalCycleResult>(`${ENDPOINTS.goalCycles}/${id}`)
        return toCycleDetail(result)
      },
      async createCycle(input) {
        const cycle = await http.post<{ id: string }>(ENDPOINTS.goalCycles, cyclePayload(input))
        return cycle.id
      },
      async updateCycle(id, input) {
        await http.patch<unknown>(`${ENDPOINTS.goalCycles}/${id}`, cyclePayload(input))
      },
      async closeCycle(id) {
        await http.post<unknown>(`${ENDPOINTS.goalCycles}/${id}/close`, {})
      },
      async reopenCycle(id) {
        await http.post<unknown>(`${ENDPOINTS.goalCycles}/${id}/reopen`, {})
      },
      async deleteCycle(id) {
        await http.delete<void>(`${ENDPOINTS.goalCycles}/${id}`)
      },
      async getObjective(id) {
        return toObjectiveRecord(
          await http.get<ApiGoalObjective>(`${ENDPOINTS.goalObjectives}/${id}`),
        )
      },
      async createObjective(cycleId, input) {
        await http.post<unknown>(
          `${ENDPOINTS.goalCycles}/${cycleId}/objectives`,
          objectivePayload(input),
        )
      },
      async updateObjective(id, input) {
        await http.patch<unknown>(`${ENDPOINTS.goalObjectives}/${id}`, objectivePayload(input))
      },
      async abandonObjective(id) {
        await http.patch<unknown>(`${ENDPOINTS.goalObjectives}/${id}`, { status: 'ABANDONED' })
      },
      async deleteObjective(id) {
        await http.delete<void>(`${ENDPOINTS.goalObjectives}/${id}`)
      },
      async listProgress(objectiveId) {
        const rows = await http.get<ApiGoalProgressEntry[]>(
          `${ENDPOINTS.goalObjectives}/${objectiveId}/progress`,
        )
        return rows.map((row) => ({
          id: row.id,
          occurredOn: row.occurredOn,
          value: Number(row.value),
          note: row.note,
        }))
      },
      async addProgress(objectiveId, input) {
        await http.post<unknown>(`${ENDPOINTS.goalObjectives}/${objectiveId}/progress`, {
          occurredOn: input.occurredOn,
          value: input.value.toFixed(2),
          note: input.note ?? undefined,
        })
      },
      async deleteProgress(id) {
        await http.delete<void>(`${ENDPOINTS.goalProgress}/${id}`)
      },
    },

    habits: {
      async list(includeArchived = false) {
        const rows = await http.get<ApiHabitDefinition[]>(ENDPOINTS.habits, {
          includeArchived: includeArchived ? 'true' : undefined,
        })
        return rows.map(toHabitDefinition)
      },
      async create(input) {
        const row = await http.post<ApiHabitDefinition>(ENDPOINTS.habits, habitPayload(input))
        return row.id
      },
      async update(id, input) {
        await http.patch(`${ENDPOINTS.habits}/${id}`, {
          ...habitPayload(input),
          active: input.active,
        })
      },
      async day(date) {
        return toHabitDay(await http.get<ApiHabitDay>(`${ENDPOINTS.habits}/day/${date}`))
      },
      async range(from, to) {
        const days = await http.get<ApiHabitDay[]>(`${ENDPOINTS.habits}/range`, { from, to })
        return days.map(toHabitDay)
      },
      async addItem(date, input) {
        await http.post(`${ENDPOINTS.habits}/day/${date}/items`, {
          ...input,
          measurementType: input.measurementType
            ? HABIT_MEASUREMENT_TO_API[input.measurementType]
            : undefined,
          targetValue: input.targetValue?.toFixed(2),
        })
      },
      async updateItem(id, input) {
        await http.patch(`${ENDPOINTS.habits}/items/${id}`, {
          ...input,
          state:
            input.state === undefined
              ? undefined
              : input.state === 'ignorado'
                ? 'SKIPPED'
                : 'PLANNED',
          targetValue: input.targetValue?.toFixed(2),
        })
      },
      async deleteItem(id) {
        await http.delete(`${ENDPOINTS.habits}/items/${id}`)
      },
      async addRecord(itemId, input) {
        await http.post(`${ENDPOINTS.habits}/items/${itemId}/records`, {
          value: input.value?.toFixed(2),
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          note: input.note ?? undefined,
        })
      },
      async deleteRecord(id) {
        await http.delete(`${ENDPOINTS.habits}/records/${id}`)
      },
      async stats(from, to, habitId) {
        return toHabitStats(
          await http.get<ApiHabitStats>(`${ENDPOINTS.habits}/stats`, { from, to, habitId }),
        )
      },
    },
  }
}

const HABIT_MEASUREMENT_TO_API = {
  check: 'CHECK',
  contagem: 'COUNT',
  duracao: 'DURATION',
} as const

const HABIT_MEASUREMENT_FROM_API = {
  CHECK: 'check',
  COUNT: 'contagem',
  DURATION: 'duracao',
} as const

function toHabitDefinition(row: ApiHabitDefinition): HabitDefinition {
  return {
    ...row,
    measurementType: HABIT_MEASUREMENT_FROM_API[row.measurementType],
    defaultDailyTarget: Number(row.defaultDailyTarget),
  }
}

function toHabitItem(item: ApiHabitDay['items'][number]): HabitDailyItem {
  return {
    id: item.id,
    plannedOn: item.plannedOn,
    habitId: item.habitId,
    title: item.title,
    measurementType: HABIT_MEASUREMENT_FROM_API[item.measurementType],
    targetValue: Number(item.targetValue),
    currentValue: Number(item.currentValue),
    unit: item.unit,
    position: item.position,
    state: item.state === 'SKIPPED' ? 'ignorado' : 'planejado',
    completed: item.completed,
    records: item.records.map((record) => ({
      ...record,
      value: Number(record.value),
    })),
  }
}

function toHabitDay(day: ApiHabitDay) {
  return {
    date: day.date,
    planned: day.planned,
    completed: day.completed,
    completionRate: Number(day.completionRate),
    items: day.items.map(toHabitItem),
  }
}

function toHabitStats(stats: ApiHabitStats): HabitStats {
  return {
    ...stats,
    adherence: Number(stats.adherence),
    durationMinutes: Number(stats.durationMinutes),
    countValue: Number(stats.countValue),
    habits: stats.habits.map((habit) => ({
      ...habit,
      adherence: Number(habit.adherence),
      durationMinutes: Number(habit.durationMinutes),
      countValue: Number(habit.countValue),
    })),
  }
}

function habitPayload(input: import('../contracts').HabitInput) {
  return {
    name: input.name,
    description: input.description ?? undefined,
    color: input.color ?? undefined,
    measurementType: HABIT_MEASUREMENT_TO_API[input.measurementType],
    unit: input.unit ?? undefined,
    defaultDailyTarget: input.defaultDailyTarget.toFixed(2),
    weeklyTarget: input.weeklyTarget,
  }
}

function toWishItem(item: ApiWishItem) {
  return {
    id: item.id,
    description: item.description,
    estimatedAmount: decimalToCents(item.estimatedAmount),
    desiredDate: item.desiredDate,
    priority: item.priority === 'LOW' ? 'baixa' as const : item.priority === 'HIGH' ? 'alta' as const : 'media' as const,
    productUrl: item.productUrl,
    notes: item.notes,
    status:
      item.status === 'WANTED'
        ? 'desejado' as const
        : item.status === 'PLANNED'
          ? 'planejado' as const
          : item.status === 'PURCHASED'
            ? 'comprado' as const
            : 'arquivado' as const,
  }
}

function wishPayload(input: import('../contracts').WishInput) {
  return {
    description: input.description,
    estimatedAmount: centsToDecimal(input.estimatedAmount),
    desiredDate: input.desiredDate ?? null,
    priority: input.priority === 'baixa' ? 'LOW' : input.priority === 'alta' ? 'HIGH' : 'MEDIUM',
    productUrl: input.productUrl ?? null,
    notes: input.notes ?? null,
  }
}

function toPlannedExpense(item: ApiPlannedExpense) {
  return {
    id: item.id,
    wishItemId: item.wishItemId,
    accountId: item.accountId,
    accountName: item.account?.name ?? '—',
    cardId: item.cardId,
    cardName: item.card?.name ?? null,
    categoryId: item.categoryId,
    categoryName: item.category?.name ?? '—',
    description: item.description,
    amount: decimalToCents(item.amount),
    plannedDate: item.plannedDate,
    method: methodFromApi(item.paymentMethod) ?? 'pix',
    expenseMode: item.entryMode === 'INSTALLMENT' ? 'parcelada' as const : 'unica' as const,
    installmentCount: item.installmentCount,
    includedInSimulation: item.includedInSimulation,
    status:
      item.status === 'PLANNED'
        ? 'planejado' as const
        : item.status === 'REALIZED'
          ? 'realizado' as const
          : 'cancelado' as const,
    actualPurchaseDate: item.actualPurchaseDate,
    realizedTransactionId: item.realizedTransactionId,
  }
}

function plannedExpensePayload(input: import('../contracts').PlannedExpenseInput) {
  return {
    wishItemId: input.wishItemId ?? undefined,
    accountId: input.accountId ?? undefined,
    cardId: input.cardId ?? undefined,
    categoryId: input.categoryId,
    description: input.description,
    amount: centsToDecimal(input.amount),
    plannedDate: input.plannedDate,
    paymentMethod: methodToApi(input.method),
    entryMode: input.expenseMode === 'parcelada' ? 'INSTALLMENT' : 'ONE_TIME',
    installmentCount: input.expenseMode === 'parcelada' ? input.installmentCount : undefined,
    includedInSimulation: input.includedInSimulation,
  }
}

function toPersonalCommitment(item: ApiPersonalCommitment) {
  return {
    id: item.id,
    beneficiaryName: item.beneficiaryName,
    description: item.description,
    amount: decimalToCents(item.amount),
    accountId: item.accountId,
    accountName: item.account?.name ?? '—',
    cardId: item.cardId,
    cardName: item.card?.name ?? null,
    categoryId: item.categoryId,
    categoryName: item.category?.name ?? '—',
    method: methodFromApi(item.paymentMethod) ?? 'pix',
    schedule: item.scheduleType === 'INSTALLMENT' ? 'parcelado' as const : 'recorrente' as const,
    startDate: item.startDate,
    installmentCount: item.installmentCount,
    endDate: item.endDate,
    includedInSimulation: item.includedInSimulation,
    status: item.status === 'ACTIVE'
      ? 'ativo' as const
      : item.status === 'PAUSED'
        ? 'pausado' as const
        : item.status === 'COMPLETED'
          ? 'concluido' as const
          : 'cancelado' as const,
    paidOccurrences: item.paidOccurrences,
  }
}

function commitmentPayload(input: import('../contracts').PersonalCommitmentInput) {
  return {
    beneficiaryName: input.beneficiaryName,
    description: input.description,
    amount: centsToDecimal(input.amount),
    accountId: input.accountId ?? undefined,
    cardId: input.cardId ?? undefined,
    categoryId: input.categoryId,
    paymentMethod: methodToApi(input.method),
    scheduleType: input.schedule === 'parcelado' ? 'INSTALLMENT' : 'RECURRING',
    startDate: input.startDate,
    installmentCount: input.schedule === 'parcelado' ? input.installmentCount : undefined,
    endDate: input.schedule === 'recorrente' ? input.endDate : undefined,
    includedInSimulation: input.includedInSimulation,
  }
}

function methodLabel(method: string): string {
  if (method === 'PIX') return 'Pix'
  if (method === 'BOLETO') return 'Boleto'
  if (method === 'DEBIT') return 'Débito'
  if (method === 'CREDIT') return 'Crédito'
  return 'Outro'
}

/* ----------------------------------- Metas ---------------------------------- */

const METRIC_FROM_API = {
  COMPLETION: 'conclusao',
  COUNT: 'contagem',
  AMOUNT: 'valor',
  PERCENT: 'percentual',
} as const

const METRIC_TO_API = {
  conclusao: 'COMPLETION',
  contagem: 'COUNT',
  valor: 'AMOUNT',
  percentual: 'PERCENT',
} as const

const CYCLE_STATUS_FROM_API = {
  PLANNED: 'planejado',
  ACTIVE: 'ativo',
  CLOSED: 'encerrado',
} as const

const OBJECTIVE_STATUS_FROM_API = {
  ACTIVE: 'ativo',
  ACHIEVED: 'alcancado',
  ABANDONED: 'abandonado',
} as const

const CYCLE_TYPE_FROM_API = {
  CUSTOM: 'personalizado',
  ANNUAL: 'anual',
  SEMESTER: 'semestral',
  QUARTER: 'trimestral',
} as const

const CYCLE_TYPE_TO_API = {
  personalizado: 'CUSTOM',
  anual: 'ANNUAL',
  semestral: 'SEMESTER',
  trimestral: 'QUARTER',
} as const

const GOAL_AGGREGATION_TO_API = {
  'dias-concluidos': 'COMPLETED_DAYS',
  ocorrencias: 'OCCURRENCES',
  soma: 'SUM',
  duracao: 'DURATION',
} as const

const GOAL_AGGREGATION_FROM_API = {
  COMPLETED_DAYS: 'dias-concluidos',
  OCCURRENCES: 'ocorrencias',
  SUM: 'soma',
  DURATION: 'duracao',
} as const

const GOAL_CADENCE_TO_API = { diaria: 'DAILY', semanal: 'WEEKLY', mensal: 'MONTHLY' } as const
const GOAL_CADENCE_FROM_API = { DAILY: 'diaria', WEEKLY: 'semanal', MONTHLY: 'mensal' } as const

function toCycleSummary(
  cycle: import('./apiTypes').ApiGoalCycle,
  summary: import('./apiTypes').ApiGoalSummary,
): GoalCycleSummary {
  return {
    id: cycle.id,
    name: cycle.name,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    expectedErrorMargin: Number(cycle.expectedErrorMargin),
    status: CYCLE_STATUS_FROM_API[cycle.status],
    note: cycle.note,
    realErrorMargin: Number(summary.realErrorMargin),
    projectedErrorMargin: Number(summary.projectedErrorMargin),
    deviation: Number(summary.deviation),
    withinMargin: summary.withinMargin,
    elapsedFraction: Number(summary.elapsedFraction),
    objectiveCount: summary.objectiveCount,
    cycleType: CYCLE_TYPE_FROM_API[cycle.cycleType],
    parentCycleId: cycle.parentCycleId,
  }
}

function toCycleDetail(result: ApiGoalCycleResult): GoalCycleDetail {
  return {
    ...toCycleSummary(result.cycle, result.summary),
    objectives: result.objectives.map((objective) => ({
      id: objective.id,
      title: objective.title,
      description: null,
      metricType: METRIC_FROM_API[objective.metricType],
      direction: objective.direction === 'DECREASE' ? 'reduzir' : 'aumentar',
      baselineValue: Number(objective.baselineValue),
      targetValue: Number(objective.targetValue),
      currentValue: Number(objective.currentValue),
      unit: objective.unit,
      weight: Number(objective.weight),
      expectedErrorMargin: Number(objective.expectedErrorMargin),
      attainment: Number(objective.attainment),
      errorPercent: Number(objective.errorPercent),
      withinMargin: objective.withinMargin,
      status: OBJECTIVE_STATUS_FROM_API[objective.status],
      sourceType: objective.sourceType === 'HABITS' ? 'habits' : 'manual',
      evaluationMode: objective.evaluationMode === 'RECURRING' ? 'recorrente' : 'total',
      cadence: objective.cadence ? GOAL_CADENCE_FROM_API[objective.cadence] : null,
      currentWindow: objective.currentWindow
        ? { actual: Number(objective.currentWindow.actual), target: Number(objective.currentWindow.target) }
        : null,
    })),
  }
}

function toObjectiveRecord(objective: ApiGoalObjective) {
  return {
    id: objective.id,
    cycleId: objective.cycleId,
    title: objective.title,
    description: objective.description,
    metricType: METRIC_FROM_API[objective.metricType],
    direction: objective.direction === 'DECREASE' ? ('reduzir' as const) : ('aumentar' as const),
    baselineValue: Number(objective.baselineValue),
    targetValue: Number(objective.targetValue),
    currentValue: Number(objective.currentValue),
    unit: objective.unit,
    weight: Number(objective.weight),
    expectedErrorMargin:
      objective.expectedErrorMargin === null ? null : Number(objective.expectedErrorMargin),
    status: OBJECTIVE_STATUS_FROM_API[objective.status],
    cycleStartDate: objective.cycleStartDate,
    cycleEndDate: objective.cycleEndDate,
    cycleStatus: CYCLE_STATUS_FROM_API[objective.cycleStatus],
    parentObjectiveId: objective.parentObjectiveId,
    sourceBinding: objective.sourceBinding
      ? {
          sourceType: objective.sourceBinding.sourceType === 'HABITS' ? 'habits' as const : 'manual' as const,
          sourceIds: objective.sourceBinding.sourceIds,
          aggregation: GOAL_AGGREGATION_FROM_API[objective.sourceBinding.aggregation],
          evaluationMode: objective.sourceBinding.evaluationMode === 'RECURRING' ? 'recorrente' as const : 'total' as const,
          cadence: objective.sourceBinding.cadence ? GOAL_CADENCE_FROM_API[objective.sourceBinding.cadence] : null,
          targetPerWindow: objective.sourceBinding.targetPerWindow === null ? null : Number(objective.sourceBinding.targetPerWindow),
          allowCarryover: objective.sourceBinding.allowCarryover,
        }
      : null,
  }
}

function cyclePayload(input: GoalCycleInput) {
  return {
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    expectedErrorMargin: input.expectedErrorMargin.toFixed(2),
    note: input.note ?? undefined,
    cycleType: CYCLE_TYPE_TO_API[input.cycleType ?? 'personalizado'],
    parentCycleId: input.parentCycleId ?? undefined,
  }
}

function objectivePayload(input: GoalObjectiveInput) {
  return {
    title: input.title,
    description: input.description ?? undefined,
    metricType: METRIC_TO_API[input.metricType],
    direction: input.direction === 'reduzir' ? 'DECREASE' : 'INCREASE',
    baselineValue: input.baselineValue.toFixed(2),
    targetValue: input.targetValue.toFixed(2),
    unit: input.unit ?? undefined,
    weight: input.weight.toFixed(2),
    expectedErrorMargin:
      input.expectedErrorMargin === null ? undefined : input.expectedErrorMargin.toFixed(2),
    parentObjectiveId: input.parentObjectiveId ?? undefined,
    sourceType: input.sourceBinding?.sourceType === 'habits' ? 'HABITS' : 'MANUAL',
    sourceIds: input.sourceBinding?.sourceIds,
    aggregation: input.sourceBinding ? GOAL_AGGREGATION_TO_API[input.sourceBinding.aggregation] : undefined,
    evaluationMode: input.sourceBinding?.evaluationMode === 'recorrente' ? 'RECURRING' : 'TOTAL',
    cadence: input.sourceBinding?.cadence ? GOAL_CADENCE_TO_API[input.sourceBinding.cadence] : undefined,
    targetPerWindow: input.sourceBinding?.targetPerWindow?.toFixed(2),
    allowCarryover: input.sourceBinding?.allowCarryover,
  }
}
