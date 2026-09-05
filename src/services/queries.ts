import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { services } from './index'
import { queryKeys } from './queryKeys'
import type {
  AccountInput,
  CardInput,
  CategoryInput,
  ExpenseInput,
  IncomeInput,
  InvoicePaymentInput,
  OverviewParams,
  ScopeParams,
  TransactionListParams,
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

export function useExpenseQuery(id: Id | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions.expense(id ?? ''),
    queryFn: () => services.transactions.getExpense(id as Id),
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

/* --------------------------------- Invalidação ------------------------------ */

type Domain = 'overview' | 'accounts' | 'transactions' | 'cards' | 'invoices' | 'categories'

const PREFIX: Record<Domain, readonly string[]> = {
  overview: queryKeys.overview.all,
  accounts: queryKeys.accounts.all,
  transactions: queryKeys.transactions.all,
  cards: queryKeys.cards.all,
  invoices: queryKeys.invoices.all,
  categories: queryKeys.categories.all,
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
export function useExpenseMutation(id?: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ExpenseInput) =>
      id ? services.transactions.updateExpense(id, input) : services.transactions.createExpense(input),
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
      id ? services.categories.rename(id, { name: input.name }) : services.categories.create(input),
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
