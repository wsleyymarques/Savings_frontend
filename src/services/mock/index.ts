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
  overdueInvoiceTotal,
  paymentBreakdown,
  selectableCategories,
  totalBalance,
  type AccountScope,
} from '../../data/selectors'
import { PAYMENT_METHOD_SHORT, type Id } from '../../data/types'
import type {
  AccountDetail,
  CardDetail,
  GoalCycleDetail,
  GoalCycleSummary,
  GoalObjectiveRecord,
  GoalObjectiveRow,
  GoalProgressEntry,
  InvoiceDetail,
  OverviewSummary,
  PlannedExpense,
  PersonalCommitment,
  CommitmentOccurrence,
  PlanningSimulation,
  ScopeParams,
  Services,
  TransactionList,
  TransactionListParams,
  WishItem,
} from '../contracts'
import { attainmentOf, summarize } from '../../lib/goals'
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
  const wishes: WishItem[] = []
  const plannedExpenses: PlannedExpense[] = []
  const commitments: PersonalCommitment[] = []
  const commitmentPayments = new Map<string, { paymentDate: string; transactionId: string; amount: number }>()
  const goalCycles: MockCycle[] = []
  const goalObjectives: MockObjective[] = []
  const goalProgress: Array<GoalProgressEntry & { objectiveId: string }> = []

  function cycleOrFail(id: string): MockCycle {
    const cycle = goalCycles.find((item) => item.id === id)
    if (!cycle) throw new DataError('Ciclo não encontrado.')
    return cycle
  }

  function objectiveOrFail(id: string): MockObjective {
    const objective = goalObjectives.find((item) => item.id === id)
    if (!objective) throw new DataError('Objetivo não encontrado.')
    return objective
  }

  function summaryOf(cycle: MockCycle): GoalCycleSummary {
    const objectives = goalObjectives.filter((item) => item.cycleId === cycle.id)
    const reference = cycle.closedOn ?? todayIso()
    return { ...cycle, ...summarize(cycle, objectives, reference) }
  }

  function rowOf(cycle: MockCycle, objective: MockObjective): GoalObjectiveRow {
    const attainment = attainmentOf(objective)
    const errorPercent = Math.round((1 - attainment) * 10_000) / 100
    const margin = objective.expectedErrorMargin ?? cycle.expectedErrorMargin
    return {
      ...objective,
      expectedErrorMargin: margin,
      attainment: Math.round(attainment * 10_000) / 10_000,
      errorPercent,
      withinMargin: errorPercent <= margin,
    }
  }

  /** Repete a materialização feita pelo backend a cada escrita de progresso. */
  function recalculate(objective: MockObjective): void {
    const entries = goalProgress
      .filter((entry) => entry.objectiveId === objective.id)
      .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn))

    if (objective.metricType === 'contagem' || objective.metricType === 'valor') {
      objective.currentValue = entries.reduce(
        (total, entry) => total + entry.value,
        objective.baselineValue,
      )
    } else if (entries.length === 0) {
      objective.currentValue = objective.metricType === 'conclusao' ? 0 : objective.baselineValue
    } else {
      const last = entries[entries.length - 1].value
      objective.currentValue = objective.metricType === 'conclusao' ? (last >= 1 ? 1 : 0) : last
    }

    if (objective.status !== 'abandonado') {
      const reached =
        objective.direction === 'reduzir'
          ? objective.currentValue <= objective.targetValue
          : objective.currentValue >= objective.targetValue
      objective.status = reached ? 'alcancado' : 'ativo'
    }
  }

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
            overdueInvoices: overdueInvoiceTotal(state, ids, store.today),
          },
          period: {
            income,
            expense,
            realizedExpense: expense,
            projectedExpense: 0,
            result: income - expense,
          },
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
            .map((card) => toCardSummary(state, card, store.today)),
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
            .map((card) => toCardSummary(state, card, store.today)),
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
      deleteIncome: (id) => store.deleteIncome(id),
      createExpense: (input) => store.createExpense(input),
      updateExpense: (id, input) => store.updateExpense(id, input),
      deleteExpense: (id) => store.deleteExpense(id),
      getRecurringExpense: (id) => store.peek().expenses.find((item) => item.id === id)
        ? Promise.resolve({
            ...store.peek().expenses.find((item) => item.id === id)!,
            expenseMode: 'recorrente' as const,
            recurrenceEndDate: null,
          })
        : Promise.reject(new DataError('Recorrência não encontrada.')),
      updateRecurringExpense: (id, input) => store.updateExpense(id, input),
      cancelRecurringExpense: (id) => store.deleteExpense(id),
    },

    cards: {
      async list(params) {
        const { state, ids } = await scopedIds(params)
        return {
          items: state.cards
            .filter((card) => ids.includes(card.accountId))
            .map((card) => toCardSummary(state, card, store.today)),
          totals: creditSummary(state, ids),
        }
      },
      async get(id): Promise<CardDetail> {
        const state = await store.snapshot()
        const card = findCard(state, id)
        if (!card) throw new DataError('Cartão não encontrado.')

        return {
          ...toCardSummary(state, card, store.today),
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
        return toCardSummary(state, card, store.today)
      },
      async update(id, input) {
        await store.updateCard(id, input)
        const state = store.peek()
        const card = findCard(state, id)
        if (!card) throw new DataError('Cartão não encontrado.')
        return toCardSummary(state, card, store.today)
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
      async rename(id, { name, accountId }) {
        const category = await store.renameCategory(id, name, accountId)
        return toCategoryRow(store.peek(), category)
      },
      archive: (id) => store.archiveCategory(id),
    },

    planning: {
      async listWishes() {
        return [...wishes]
      },
      async getWish(id) {
        const item = wishes.find((wish) => wish.id === id)
        if (!item) throw new DataError('Desejo não encontrado.')
        return item
      },
      async createWish(input) {
        const item: WishItem = { id: crypto.randomUUID(), ...input, status: 'desejado' }
        wishes.unshift(item)
        return item
      },
      async updateWish(id, input) {
        const index = wishes.findIndex((wish) => wish.id === id)
        if (index < 0) throw new DataError('Desejo não encontrado.')
        wishes[index] = { ...wishes[index], ...input }
        return wishes[index]
      },
      async archiveWish(id) {
        const item = wishes.find((wish) => wish.id === id)
        if (!item) throw new DataError('Desejo não encontrado.')
        item.status = 'arquivado'
      },
      async listPlannedExpenses(params) {
        return plannedExpenses.filter((item) => !params.accountId || item.accountId === params.accountId)
      },
      async getPlannedExpense(id) {
        const item = plannedExpenses.find((expense) => expense.id === id)
        if (!item) throw new DataError('Gasto planejado não encontrado.')
        return item
      },
      async createPlannedExpense(input) {
        const state = store.peek()
        const account = state.accounts.find((item) => item.id === input.accountId)
        const card = state.cards.find((item) => item.id === input.cardId)
        const category = state.categories.find((item) => item.id === input.categoryId)
        if (!account || !category) throw new DataError('Conta ou categoria inválida.')
        const item: PlannedExpense = {
          id: crypto.randomUUID(),
          ...input,
          accountId: account.id,
          accountName: account.name,
          cardName: card?.name ?? null,
          categoryId: category.id,
          categoryName: category.name,
          status: 'planejado',
          actualPurchaseDate: null,
          realizedTransactionId: null,
        }
        plannedExpenses.push(item)
        const wish = wishes.find((candidate) => candidate.id === input.wishItemId)
        if (wish) wish.status = 'planejado'
        return item
      },
      async updatePlannedExpense(id, input) {
        const current = plannedExpenses.find((item) => item.id === id)
        if (!current) throw new DataError('Gasto planejado não encontrado.')
        const state = store.peek()
        const account = state.accounts.find((item) => item.id === input.accountId)
        const card = state.cards.find((item) => item.id === input.cardId)
        const category = state.categories.find((item) => item.id === input.categoryId)
        if (!account || !category) throw new DataError('Conta ou categoria inválida.')
        Object.assign(current, input, {
          accountId: account.id,
          accountName: account.name,
          cardName: card?.name ?? null,
          categoryId: category.id,
          categoryName: category.name,
        })
        return current
      },
      async cancelPlannedExpense(id) {
        const item = plannedExpenses.find((expense) => expense.id === id)
        if (!item) throw new DataError('Gasto planejado não encontrado.')
        item.status = 'cancelado'
      },
      async realizePlannedExpense(id, input) {
        const item = plannedExpenses.find((expense) => expense.id === id)
        if (!item || item.status !== 'planejado') throw new DataError('Gasto planejado indisponível.')
        await store.createExpense({
          description: item.description,
          amount: input.actualAmount ?? item.amount,
          date: input.purchaseDate,
          method: item.method,
          accountId: item.accountId,
          cardId: item.cardId,
          categoryId: item.categoryId,
          expenseMode: item.expenseMode,
          installmentCount: item.installmentCount ?? undefined,
        })
        item.status = 'realizado'
        item.actualPurchaseDate = input.purchaseDate
        item.amount = input.actualAmount ?? item.amount
        item.realizedTransactionId = crypto.randomUUID()
        const wish = wishes.find((candidate) => candidate.id === item.wishItemId)
        if (wish) wish.status = 'comprado'
        return item
      },
      async listCommitments(params) {
        return commitments.filter((item) => !params.accountId || item.accountId === params.accountId)
      },
      async getCommitment(id) {
        const item = commitments.find((candidate) => candidate.id === id)
        if (!item) throw new DataError('Compromisso não encontrado.')
        return item
      },
      async createCommitment(input) {
        const state = store.peek()
        const card = state.cards.find((item) => item.id === input.cardId)
        const account = state.accounts.find((item) => item.id === (input.accountId ?? card?.accountId))
        const category = state.categories.find((item) => item.id === input.categoryId)
        if (!account || !category) throw new DataError('Conta ou categoria inválida.')
        const item: PersonalCommitment = {
          id: crypto.randomUUID(),
          ...input,
          accountId: account.id,
          accountName: account.name,
          cardName: card?.name ?? null,
          categoryId: category.id,
          categoryName: category.name,
          status: 'ativo',
          paidOccurrences: 0,
        }
        commitments.push(item)
        return item
      },
      async updateCommitment(id, input) {
        const item = commitments.find((candidate) => candidate.id === id)
        if (!item) throw new DataError('Compromisso não encontrado.')
        const state = store.peek()
        const card = state.cards.find((candidate) => candidate.id === input.cardId)
        const account = state.accounts.find((candidate) => candidate.id === (input.accountId ?? card?.accountId))
        const category = state.categories.find((candidate) => candidate.id === input.categoryId)
        if (!account || !category) throw new DataError('Conta ou categoria inválida.')
        Object.assign(item, input, {
          accountId: account.id,
          accountName: account.name,
          cardName: card?.name ?? null,
          categoryId: category.id,
          categoryName: category.name,
        })
        return item
      },
      async pauseCommitment(id) {
        const item = commitments.find((candidate) => candidate.id === id)
        if (!item) throw new DataError('Compromisso não encontrado.')
        item.status = 'pausado'
        return item
      },
      async resumeCommitment(id) {
        const item = commitments.find((candidate) => candidate.id === id)
        if (!item) throw new DataError('Compromisso não encontrado.')
        item.status = 'ativo'
        return item
      },
      async cancelCommitment(id) {
        const item = commitments.find((candidate) => candidate.id === id)
        if (!item) throw new DataError('Compromisso não encontrado.')
        item.status = 'cancelado'
      },
      async listCommitmentOccurrences(params) {
        return commitments
          .filter((item) => !params.accountId || item.accountId === params.accountId)
          .flatMap((item) => mockOccurrences(item, params.start, params.end, commitmentPayments))
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      },
      async registerCommitmentPayment(id, scheduledDate, input) {
        const item = commitments.find((candidate) => candidate.id === id)
        if (!item || item.status !== 'ativo') throw new DataError('Compromisso indisponível.')
        const key = `${id}:${scheduledDate}`
        if (commitmentPayments.has(key)) throw new DataError('Pagamento já registrado.')
        await store.createExpense({
          description: `${item.description} — ${item.beneficiaryName}`,
          amount: input.actualAmount ?? item.amount,
          date: input.paymentDate,
          method: item.method,
          accountId: item.accountId,
          cardId: item.cardId,
          categoryId: item.categoryId,
          expenseMode: 'unica',
        })
        commitmentPayments.set(key, {
          paymentDate: input.paymentDate,
          transactionId: crypto.randomUUID(),
          amount: input.actualAmount ?? item.amount,
        })
        item.paidOccurrences += 1
        if (item.schedule === 'parcelado' && item.paidOccurrences >= (item.installmentCount ?? 0)) {
          item.status = 'concluido'
        }
      },
      async simulate(params): Promise<PlanningSimulation> {
        const state = store.peek()
        const accountIds = state.accounts
          .filter((account) => !params.accountId || account.id === params.accountId)
          .map((account) => account.id)
        const active = plannedExpenses.filter(
          (item) =>
            item.status === 'planejado' &&
            item.includedInSimulation &&
            accountIds.includes(item.accountId),
        )
        const currentBalance = totalBalance(state, accountIds)
        const immediate = sum(active.filter((item) => item.method !== 'credito').map((item) => item.amount))
        const future = sum(active.filter((item) => item.method === 'credito').map((item) => item.amount))
        return {
          selectedCount: active.length,
          totalPlanned: sum(active.map((item) => item.amount)),
          currentBalance,
          balanceAfterPurchases: currentBalance - immediate,
          balanceAfterAllPayments: currentBalance - immediate - future,
          accounts: [],
          cards: [],
          timeline: active.map((item) => ({
            plannedExpenseId: item.id,
            description: item.description,
            date: item.plannedDate,
            amount: item.amount,
            kind: item.method === 'credito' ? 'pagamento-cartao' : 'compra',
            installmentNumber: null,
            installmentCount: item.installmentCount,
          })),
          warnings: [],
        }
      },
    },

    goals: {
      async listCycles() {
        return goalCycles.map(summaryOf)
      },
      async getCycle(id) {
        const cycle = cycleOrFail(id)
        const detail: GoalCycleDetail = {
          ...summaryOf(cycle),
          objectives: goalObjectives
            .filter((objective) => objective.cycleId === cycle.id)
            .map((objective) => rowOf(cycle, objective)),
        }
        return detail
      },
      async createCycle(input) {
        if (input.endDate < input.startDate) {
          throw new DataError('O fim do ciclo não pode ser anterior ao início.')
        }
        const cycle: MockCycle = {
          id: crypto.randomUUID(),
          ...input,
          status: todayIso() < input.startDate ? 'planejado' : 'ativo',
          closedOn: null,
        }
        goalCycles.unshift(cycle)
        return cycle.id
      },
      async updateCycle(id, input) {
        const cycle = cycleOrFail(id)
        if (cycle.status === 'encerrado') throw new DataError('Reabra o ciclo antes de editá-lo.')
        if (input.endDate < input.startDate) {
          throw new DataError('O fim do ciclo não pode ser anterior ao início.')
        }
        Object.assign(cycle, input)
      },
      async closeCycle(id) {
        const cycle = cycleOrFail(id)
        cycle.status = 'encerrado'
        cycle.closedOn = todayIso()
      },
      async reopenCycle(id) {
        const cycle = cycleOrFail(id)
        cycle.status = todayIso() < cycle.startDate ? 'planejado' : 'ativo'
        cycle.closedOn = null
      },
      async deleteCycle(id) {
        const cycle = cycleOrFail(id)
        const objectiveIds = goalObjectives
          .filter((objective) => objective.cycleId === cycle.id)
          .map((objective) => objective.id)
        goalProgress
          .filter((entry) => objectiveIds.includes(entry.objectiveId))
          .forEach((entry) => goalProgress.splice(goalProgress.indexOf(entry), 1))
        objectiveIds.forEach((objectiveId) => {
          const index = goalObjectives.findIndex((objective) => objective.id === objectiveId)
          if (index >= 0) goalObjectives.splice(index, 1)
        })
        goalCycles.splice(goalCycles.indexOf(cycle), 1)
      },
      async getObjective(id) {
        const objective = objectiveOrFail(id)
        const cycle = cycleOrFail(objective.cycleId)
        return {
          ...objective,
          cycleStartDate: cycle.startDate,
          cycleEndDate: cycle.endDate,
          cycleStatus: cycle.status,
        }
      },
      async createObjective(cycleId, input) {
        const cycle = cycleOrFail(cycleId)
        if (cycle.status === 'encerrado') {
          throw new DataError('Reabra o ciclo antes de adicionar objetivos.')
        }
        const normalized = normalizeGoalMetric(input)
        goalObjectives.push({
          id: crypto.randomUUID(),
          cycleId: cycle.id,
          ...input,
          ...normalized,
          currentValue: normalized.metricType === 'conclusao' ? 0 : normalized.baselineValue,
          status: 'ativo',
        })
      },
      async updateObjective(id, input) {
        const objective = objectiveOrFail(id)
        const cycle = cycleOrFail(objective.cycleId)
        if (cycle.status === 'encerrado') {
          throw new DataError('Reabra o ciclo antes de editar objetivos.')
        }
        Object.assign(objective, input, normalizeGoalMetric(input))
        recalculate(objective)
      },
      async abandonObjective(id) {
        objectiveOrFail(id).status = 'abandonado'
      },
      async deleteObjective(id) {
        const objective = objectiveOrFail(id)
        if (goalProgress.some((entry) => entry.objectiveId === id)) {
          throw new DataError(
            'Objetivo com progresso registrado não pode ser removido; marque como abandonado.',
          )
        }
        goalObjectives.splice(goalObjectives.indexOf(objective), 1)
      },
      async listProgress(objectiveId) {
        return goalProgress
          .filter((entry) => entry.objectiveId === objectiveId)
          .map(({ objectiveId: _owner, ...entry }) => entry)
          .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
      },
      async addProgress(objectiveId, input) {
        const objective = objectiveOrFail(objectiveId)
        const cycle = cycleOrFail(objective.cycleId)
        if (cycle.status === 'encerrado') {
          throw new DataError('Ciclo encerrado não aceita novos registros de progresso.')
        }
        if (input.occurredOn < cycle.startDate || input.occurredOn > cycle.endDate) {
          throw new DataError('A data do progresso está fora do período do ciclo.')
        }
        if (objective.metricType === 'percentual' && (input.value < 0 || input.value > 100)) {
          throw new DataError('Um objetivo percentual aceita leituras entre 0 e 100.')
        }
        if (objective.metricType === 'conclusao' && input.value !== 0 && input.value !== 1) {
          throw new DataError('Um objetivo de conclusão aceita apenas 0 ou 1.')
        }
        if (objective.metricType === 'contagem' && input.value <= 0) {
          throw new DataError('Um objetivo de contagem soma incrementos positivos.')
        }
        goalProgress.push({ id: crypto.randomUUID(), objectiveId, ...input })
        recalculate(objective)
      },
      async deleteProgress(id) {
        const entry = goalProgress.find((candidate) => candidate.id === id)
        if (!entry) throw new DataError('Registro de progresso não encontrado.')
        goalProgress.splice(goalProgress.indexOf(entry), 1)
        recalculate(objectiveOrFail(entry.objectiveId))
      },
    },
  }
}

interface MockCycle extends Omit<GoalCycleSummary, 'realErrorMargin' | 'projectedErrorMargin' | 'deviation' | 'withinMargin' | 'elapsedFraction' | 'objectiveCount'> {
  closedOn: string | null
}

type MockObjective = Omit<
  GoalObjectiveRecord,
  'cycleStartDate' | 'cycleEndDate' | 'cycleStatus'
>

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Conclusão é sempre 0 a 1; contagem sempre cresce a partir da linha de base. */
function normalizeGoalMetric<T extends { metricType: GoalObjectiveRecord['metricType']; direction: GoalObjectiveRecord['direction']; baselineValue: number; targetValue: number }>(
  input: T,
): { metricType: T['metricType']; direction: T['direction']; baselineValue: number; targetValue: number } {
  if (input.metricType === 'conclusao') {
    return { metricType: input.metricType, direction: 'aumentar' as T['direction'], baselineValue: 0, targetValue: 1 }
  }
  const direction = input.metricType === 'contagem' ? ('aumentar' as T['direction']) : input.direction
  if (direction === 'reduzir' && input.baselineValue <= input.targetValue) {
    throw new DataError('Em um objetivo de redução a linha de base deve ser maior que o alvo.')
  }
  if (direction === 'aumentar' && input.targetValue <= input.baselineValue) {
    throw new DataError('Em um objetivo de aumento o alvo deve ser maior que a linha de base.')
  }
  return {
    metricType: input.metricType,
    direction,
    baselineValue: input.baselineValue,
    targetValue: input.targetValue,
  }
}

export { MockStore }

function mockOccurrences(
  item: PersonalCommitment,
  start: string,
  end: string,
  payments: Map<string, { paymentDate: string; transactionId: string; amount: number }>,
): CommitmentOccurrence[] {
  if (item.status === 'cancelado' || item.status === 'pausado') return []
  const rows: CommitmentOccurrence[] = []
  const originalDay = Number(item.startDate.slice(8, 10))
  let date = item.startDate
  let number = 1
  const now = new Date().toISOString().slice(0, 10)
  while (date <= end && number <= 1200) {
    if (item.schedule === 'parcelado' && number > (item.installmentCount ?? 0)) break
    if (item.schedule === 'recorrente' && item.endDate && date > item.endDate) break
    if (date >= start) {
      const payment = payments.get(`${item.id}:${date}`)
      rows.push({
        id: `${item.id}:${date}`,
        commitmentId: item.id,
        beneficiaryName: item.beneficiaryName,
        description: item.description,
        scheduledDate: date,
        amount: payment?.amount ?? item.amount,
        installmentNumber: item.schedule === 'parcelado' ? number : null,
        installmentCount: item.installmentCount,
        status: payment ? 'pago' : date < now ? 'atrasado' : 'previsto',
        paymentDate: payment?.paymentDate ?? null,
        transactionId: payment?.transactionId ?? null,
        includedInSimulation: item.includedInSimulation,
      })
    }
    const current = new Date(`${date}T00:00:00Z`)
    const nextYear = current.getUTCMonth() === 11 ? current.getUTCFullYear() + 1 : current.getUTCFullYear()
    const nextMonth = (current.getUTCMonth() + 1) % 12
    const lastDay = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate()
    date = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(Math.min(originalDay, lastDay)).padStart(2, '0')}`
    number += 1
  }
  return rows
}
