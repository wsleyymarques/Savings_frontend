import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { services } from './index'
import { queryKeys } from './queryKeys'
import type {
  AccountInput,
  GoalCycleInput,
  GoalObjectiveInput,
  GoalProgressInput,
  CardInput,
  CategoryInput,
  ExpenseInput,
  IncomeInput,
  InvoicePaymentInput,
  OverviewParams,
  PlannedExpenseInput,
  PersonalCommitmentInput,
  ScopeParams,
  TransactionListParams,
  WishInput,
} from './contracts'
import type { Id } from '../data/types'

/* ---------------------------------- Leituras -------------------------------- */

export function useOverviewQuery(params: OverviewParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.overview.byParams(params),
    queryFn: () => services.overview.get(params),
    enabled,
  })
}

export function useAccountsQuery(params: ScopeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.accounts.list(params),
    queryFn: () => services.accounts.list(params),
    enabled,
  })
}

export function useAccountQuery(id: Id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.accounts.detail(id),
    queryFn: () => services.accounts.get(id),
    enabled: enabled && Boolean(id),
  })
}

export function useTransactionsQuery(params: TransactionListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => services.transactions.list(params),
    enabled,
  })
}

export function useTransactionsCountQuery(params: ScopeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.transactions.count(params),
    queryFn: () => services.transactions.count(params),
    enabled,
  })
}

export function useIncomeQuery(id: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions.income(id ?? ''),
    queryFn: () => services.transactions.getIncome(id as Id),
    enabled: Boolean(id),
  })
}

export function useExpenseQuery(id: Id | undefined, recurring = false) {
  return useQuery({
    queryKey: queryKeys.transactions.expense(`${recurring ? 'recurring-' : ''}${id ?? ''}`),
    queryFn: () => recurring
      ? services.transactions.getRecurringExpense(id as Id)
      : services.transactions.getExpense(id as Id),
    enabled: Boolean(id),
  })
}

export function useCardsQuery(params: ScopeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cards.list(params),
    queryFn: () => services.cards.list(params),
    enabled,
  })
}

export function useCardQuery(id: Id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cards.detail(id),
    queryFn: () => services.cards.get(id),
    enabled: enabled && Boolean(id),
  })
}

export function useInvoicesQuery(
  params: ScopeParams & { cardId?: Id | null; cycleMonth?: string | null },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => services.invoices.list(params),
    enabled,
  })
}

export function useInvoiceQuery(id: Id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => services.invoices.get(id),
    enabled: enabled && Boolean(id),
  })
}

export function useCategoriesQuery(params: ScopeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.list(params),
    queryFn: () => services.categories.list(params),
    enabled,
  })
}

export function useSelectableCategoriesQuery(params: ScopeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.selectable(params),
    queryFn: () => services.categories.selectable(params),
    enabled: enabled && Boolean(params.accountId),
  })
}

export function useWishesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.wishes,
    queryFn: () => services.planning.listWishes(),
    enabled,
  })
}

export function useWishQuery(id: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.planning.wish(id ?? ''),
    queryFn: () => services.planning.getWish(id as Id),
    enabled: Boolean(id),
  })
}

export function usePlannedExpensesQuery(params: ScopeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.expenses(params),
    queryFn: () => services.planning.listPlannedExpenses(params),
    enabled,
  })
}

export function usePlannedExpenseQuery(id: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.planning.expense(id ?? ''),
    queryFn: () => services.planning.getPlannedExpense(id as Id),
    enabled: Boolean(id),
  })
}

export function usePlanningSimulationQuery(params: ScopeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.simulation(params),
    queryFn: () => services.planning.simulate(params),
    enabled,
  })
}

export function useCommitmentsQuery(params: ScopeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planning.commitments(params),
    queryFn: () => services.planning.listCommitments(params),
    enabled,
  })
}

export function useCommitmentQuery(id: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.planning.commitment(id ?? ''),
    queryFn: () => services.planning.getCommitment(id as Id),
    enabled: Boolean(id),
  })
}

export function useCommitmentOccurrencesQuery(
  params: ScopeParams & { start: string; end: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.planning.commitmentOccurrences(params),
    queryFn: () => services.planning.listCommitmentOccurrences(params),
    enabled,
  })
}

/* --------------------------------- Invalidação ------------------------------ */

type Domain =
  | 'overview'
  | 'accounts'
  | 'transactions'
  | 'cards'
  | 'invoices'
  | 'categories'
  | 'planning'
  | 'goals'

const PREFIX: Record<Domain, readonly string[]> = {
  overview: queryKeys.overview.all,
  accounts: queryKeys.accounts.all,
  transactions: queryKeys.transactions.all,
  cards: queryKeys.cards.all,
  invoices: queryKeys.invoices.all,
  categories: queryKeys.categories.all,
  planning: queryKeys.planning.all,
  goals: queryKeys.goals.all,
}

function invalidate(client: QueryClient, domains: Domain[]) {
  return Promise.all(
    domains.map((domain) => client.invalidateQueries({ queryKey: PREFIX[domain] })),
  )
}

/* --------------------------------- Mutações --------------------------------- */

/** Receita: muda saldo das contas, a listagem e os indicadores. */
export function useIncomeMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: IncomeInput) =>
      id ? services.transactions.updateIncome(id, input) : services.transactions.createIncome(input),
    onSuccess: () => invalidate(client, ['transactions', 'accounts', 'overview']),
  })
}

/** Despesa: pode alterar saldo, limite comprometido e a fatura do ciclo. */
export function useExpenseMutation(id?: Id, recurring = false) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ExpenseInput) =>
      id
        ? recurring
          ? services.transactions.updateRecurringExpense(id, input)
          : services.transactions.updateExpense(id, input)
        : services.transactions.createExpense(input),
    onSuccess: () => invalidate(client, ['transactions', 'accounts', 'overview', 'cards', 'invoices']),
  })
}

export function useDeleteEntryMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (entry: {
      id: Id
      kind: 'receita' | 'despesa'
      recurring: boolean
    }) => {
      if (entry.recurring) return services.transactions.cancelRecurringExpense(entry.id)
      return entry.kind === 'receita'
        ? services.transactions.deleteIncome(entry.id)
        : services.transactions.deleteExpense(entry.id)
    },
    onSuccess: () => invalidate(client, ['transactions', 'accounts', 'overview', 'cards', 'invoices']),
  })
}

export function useAccountMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AccountInput) =>
      id ? services.accounts.rename(id, { name: input.name }) : services.accounts.create(input),
    onSuccess: () => invalidate(client, ['accounts', 'overview', 'cards', 'categories']),
  })
}

export function useCardMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: CardInput) =>
      id ? services.cards.update(id, input) : services.cards.create(input),
    onSuccess: () => invalidate(client, ['cards', 'overview', 'invoices']),
  })
}

export function useCategoryMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      id ? services.categories.rename(id, input) : services.categories.create(input),
    onSuccess: () => invalidate(client, ['categories', 'transactions', 'overview']),
  })
}

export function useArchiveCategoryMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.categories.archive(id),
    onSuccess: () => invalidate(client, ['categories', 'transactions', 'overview']),
  })
}

/** Quitação: reduz o saldo, libera limite e aparece como pagamento na listagem. */
export function useInvoicePaymentMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: InvoicePaymentInput) => services.invoices.registerPayment(input),
    onSuccess: () => invalidate(client, ['invoices', 'accounts', 'transactions', 'cards', 'overview']),
  })
}

export function useWishMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: WishInput) =>
      id ? services.planning.updateWish(id, input) : services.planning.createWish(input),
    onSuccess: () => invalidate(client, ['planning']),
  })
}

export function useArchiveWishMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.planning.archiveWish(id),
    onSuccess: () => invalidate(client, ['planning']),
  })
}

export function usePlannedExpenseMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: PlannedExpenseInput) =>
      id
        ? services.planning.updatePlannedExpense(id, input)
        : services.planning.createPlannedExpense(input),
    onSuccess: () => invalidate(client, ['planning']),
  })
}

export function useCancelPlannedExpenseMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.planning.cancelPlannedExpense(id),
    onSuccess: () => invalidate(client, ['planning']),
  })
}

export function useRealizePlannedExpenseMutation(id: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { purchaseDate: string; actualAmount?: number }) =>
      services.planning.realizePlannedExpense(id, input),
    onSuccess: () =>
      invalidate(client, ['planning', 'transactions', 'accounts', 'overview', 'cards', 'invoices']),
  })
}

export function useCommitmentMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: PersonalCommitmentInput) => id
      ? services.planning.updateCommitment(id, input)
      : services.planning.createCommitment(input),
    onSuccess: () => invalidate(client, ['planning', 'overview', 'transactions']),
  })
}

export function useCommitmentStatusMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: Id; action: 'pause' | 'resume' | 'cancel' }) => {
      if (action === 'pause') await services.planning.pauseCommitment(id)
      else if (action === 'resume') await services.planning.resumeCommitment(id)
      else await services.planning.cancelCommitment(id)
    },
    onSuccess: () => invalidate(client, ['planning', 'overview', 'transactions']),
  })
}

export function useRegisterCommitmentPaymentMutation(id: Id, scheduledDate: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { paymentDate: string; actualAmount?: number }) =>
      services.planning.registerCommitmentPayment(id, scheduledDate, input),
    onSuccess: () =>
      invalidate(client, ['planning', 'transactions', 'accounts', 'overview', 'cards', 'invoices']),
  })
}

/* ----------------------------------- Metas ---------------------------------- */

export function useGoalCyclesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.goals.cycles,
    queryFn: () => services.goals.listCycles(),
    enabled,
  })
}

export function useGoalCycleQuery(id: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.goals.cycle(id ?? ''),
    queryFn: () => services.goals.getCycle(id as Id),
    enabled: Boolean(id),
  })
}

export function useGoalObjectiveQuery(id: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.goals.objective(id ?? ''),
    queryFn: () => services.goals.getObjective(id as Id),
    enabled: Boolean(id),
  })
}

export function useGoalProgressQuery(objectiveId: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.goals.progress(objectiveId ?? ''),
    queryFn: () => services.goals.listProgress(objectiveId as Id),
    enabled: Boolean(objectiveId),
  })
}

export function useGoalCycleMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    // Devolve sempre o id do ciclo para a página abrir o recém-criado.
    mutationFn: async (input: GoalCycleInput): Promise<Id> => {
      if (!id) return services.goals.createCycle(input)
      await services.goals.updateCycle(id, input)
      return id
    },
    onSuccess: () => invalidate(client, ['goals']),
  })
}

export function useCloseGoalCycleMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.goals.closeCycle(id),
    onSuccess: () => invalidate(client, ['goals']),
  })
}

export function useReopenGoalCycleMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.goals.reopenCycle(id),
    onSuccess: () => invalidate(client, ['goals']),
  })
}

export function useDeleteGoalCycleMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.goals.deleteCycle(id),
    onSuccess: () => invalidate(client, ['goals']),
  })
}

export function useGoalObjectiveMutation(cycleId: Id, objectiveId?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: GoalObjectiveInput) =>
      objectiveId
        ? services.goals.updateObjective(objectiveId, input)
        : services.goals.createObjective(cycleId, input),
    onSuccess: () => invalidate(client, ['goals']),
  })
}

export function useAbandonGoalObjectiveMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.goals.abandonObjective(id),
    onSuccess: () => invalidate(client, ['goals']),
  })
}

export function useDeleteGoalObjectiveMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.goals.deleteObjective(id),
    onSuccess: () => invalidate(client, ['goals']),
  })
}

export function useGoalProgressMutation(objectiveId: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: GoalProgressInput) => services.goals.addProgress(objectiveId, input),
    onSuccess: () => invalidate(client, ['goals']),
  })
}

export function useDeleteGoalProgressMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => services.goals.deleteProgress(id),
    onSuccess: () => invalidate(client, ['goals']),
  })
}
