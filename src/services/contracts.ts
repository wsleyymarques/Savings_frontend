import type { CivilDate } from '../lib/date'
import type { Cents } from '../lib/money'
import type { CardFunction, CategoryOrigin, ExpenseMode, Id, PaymentMethod, User } from '../data/types'
import type { CycleStatus, EntryKind, PaymentStatus } from '../data/selectors'

export type { User }

/* --------------------------- Parâmetros de leitura -------------------------- */

/** `accountId` nulo representa o escopo consolidado "Todas as contas". */
export interface ScopeParams {
  accountId: Id | null
}

export interface PeriodParams {
  start: CivilDate
  end: CivilDate
}

export interface ExpenseFilterParams {
  categoryId?: Id | null
  method?: PaymentMethod | null
  expenseMode?: ExpenseMode | null
}

export interface TransactionListParams extends ScopeParams, PeriodParams, ExpenseFilterParams {
  kind?: 'todos' | 'receitas' | 'despesas'
  search?: string
}

export interface OverviewParams extends ScopeParams, PeriodParams, ExpenseFilterParams {}

/* --------------------------------- Respostas -------------------------------- */

export interface AccountSummary {
  id: Id
  name: string
  initialBalance: Cents
  referenceDate: CivilDate
  currentBalance: Cents
}

export interface AccountMovement {
  id: Id
  date: CivilDate
  description: string
  method: PaymentMethod | null
  kind: EntryKind
  /** Positivo em receitas, negativo em saídas de dinheiro. */
  amount: Cents
}

export interface CreditPurchase {
  id: Id
  date: CivilDate
  description: string
  categoryName: string
  amount: Cents
  expenseMode?: ExpenseMode
  installmentNumber?: number | null
  installmentCount?: number | null
}

export interface AccountDetail extends AccountSummary {
  movements: AccountMovement[]
  creditPurchases: CreditPurchase[]
  cards: CardSummary[]
}

export interface CardSummary {
  id: Id
  name: string
  accountId: Id
  accountName: string
  accountBalance: Cents
  functions: CardFunction
  color: string
  creditLimit: Cents | null
  committed: Cents
  available: Cents
  closingDay: number | null
  dueDay: number | null
}

export interface CardDetail extends CardSummary {
  creditPurchases: CreditPurchase[]
  debitPurchases: CreditPurchase[]
  invoices: InvoiceSummary[]
}

export interface CreditTotals {
  limit: Cents
  committed: Cents
  available: Cents
}

export interface CategoryRow {
  id: Id
  name: string
  origin: CategoryOrigin
  accountId: Id | null
  accountName: string | null
  archived: boolean
}

export interface EntryRow {
  id: Id
  kind: EntryKind
  sourceId: Id
  date: CivilDate
  description: string
  categoryLabel: string | null
  categoryArchived: boolean
  accountName: string
  cardName: string | null
  method: PaymentMethod | null
  amount: Cents
  editable: boolean
  expenseMode?: ExpenseMode
  installmentNumber?: number | null
  installmentCount?: number | null
}

export interface TransactionList {
  items: EntryRow[]
  total: number
}

export interface BreakdownItem {
  key: string
  label: string
  detail?: string
  amount: Cents
}

export interface OverviewSummary {
  position: {
    balance: Cents
    creditLimit: Cents
    creditCommitted: Cents
    creditAvailable: Cents
    openInvoices: Cents
  }
  period: {
    income: Cents
    expense: Cents
    result: Cents
  }
  filteredExpenseTotal: Cents
  categoryBreakdown: BreakdownItem[]
  paymentBreakdown: BreakdownItem[]
  accounts: AccountSummary[]
  creditCards: CardSummary[]
  latestEntries: EntryRow[]
}

export interface InvoiceSummary {
  id: Id
  cardId: Id
  cardName: string
  /** Primeiro dia do mês do ciclo, usado como filtro (AAAA-MM-DD). */
  cycleMonth: CivilDate
  /** Rótulo de exibição, por exemplo "Outubro de 2026". */
  cycleLabel: string
  periodStart: CivilDate
  periodEnd: CivilDate
  closingDate: CivilDate
  dueDate: CivilDate
  total: Cents
  paid: Cents
  remaining: Cents
  cycle: CycleStatus
  payment: PaymentStatus
  /** Elegível ao registro de pagamento integral proposto na V1. */
  payable: boolean
}

export interface InvoicePaymentRow {
  id: Id
  accountId: Id
  accountName: string
  date: CivilDate
  amount: Cents
}

export interface InvoiceDetail extends InvoiceSummary {
  purchases: CreditPurchase[]
  payments: InvoicePaymentRow[]
}

/* --------------------------- Entradas de mutação ---------------------------- */

export interface SignInInput {
  email: string
  password: string
}

export interface SignUpInput {
  name: string
  email: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface IncomeInput {
  description: string
  amount: Cents
  accountId: Id | null
  date: CivilDate
}

export interface ExpenseInput {
  description: string
  amount: Cents
  date: CivilDate
  method: PaymentMethod
  accountId: Id | null
  cardId: Id | null
  categoryId: Id | null
  expenseMode?: ExpenseMode
  installmentCount?: number
  recurrenceEndDate?: CivilDate | null
}

export interface AccountInput {
  name: string
  initialBalance: Cents
  referenceDate: CivilDate
}

export interface CardInput {
  name: string
  accountId: Id | null
  functions: CardFunction
  color: string
  creditLimit: Cents | null
  closingDay: number | null
  dueDay: number | null
}

export interface CategoryInput {
  name: string
  accountId: Id | null
}

export interface InvoicePaymentInput {
  invoiceId: Id
  accountId: Id | null
  date: CivilDate
}

/* ------------------------------ Services por domínio ------------------------ */

export interface AuthService {
  restoreSession(): Promise<User | null>
  signIn(input: SignInInput): Promise<User>
  signUp(input: SignUpInput): Promise<User>
  signOut(): Promise<void>
  updateProfile(input: { name: string }): Promise<User>
  changePassword(input: ChangePasswordInput): Promise<void>
}

export interface OverviewService {
  get(params: OverviewParams): Promise<OverviewSummary>
}

export interface AccountsService {
  list(params: ScopeParams): Promise<AccountSummary[]>
  get(id: Id): Promise<AccountDetail>
  create(input: AccountInput): Promise<AccountSummary>
  rename(id: Id, input: { name: string }): Promise<AccountSummary>
}

export interface TransactionsService {
  list(params: TransactionListParams): Promise<TransactionList>
  count(params: ScopeParams): Promise<number>
  /** Registro individual para preencher o formulário de edição. */
  getIncome(id: Id): Promise<IncomeInput>
  getExpense(id: Id): Promise<ExpenseInput>
  createIncome(input: IncomeInput): Promise<void>
  updateIncome(id: Id, input: IncomeInput): Promise<void>
  createExpense(input: ExpenseInput): Promise<void>
  updateExpense(id: Id, input: ExpenseInput): Promise<void>
}

export interface CardsService {
  list(params: ScopeParams): Promise<{ items: CardSummary[]; totals: CreditTotals }>
  get(id: Id): Promise<CardDetail>
  create(input: CardInput): Promise<CardSummary>
  update(id: Id, input: CardInput): Promise<CardSummary>
}

export interface InvoicesService {
  list(params: ScopeParams & { cardId?: Id | null; cycleMonth?: CivilDate | null }): Promise<InvoiceSummary[]>
  get(id: Id): Promise<InvoiceDetail>
  registerPayment(input: InvoicePaymentInput): Promise<void>
}

export interface CategoriesService {
  list(params: ScopeParams): Promise<CategoryRow[]>
  /** Categorias que podem ser escolhidas em um gasto daquela conta. */
  selectable(params: ScopeParams): Promise<CategoryRow[]>
  create(input: CategoryInput): Promise<CategoryRow>
  rename(id: Id, input: { name: string }): Promise<CategoryRow>
  archive(id: Id): Promise<void>
}

export interface Services {
  auth: AuthService
  overview: OverviewService
  accounts: AccountsService
  transactions: TransactionsService
  cards: CardsService
  invoices: InvoicesService
  categories: CategoriesService
}
