import type { CivilDate } from '../lib/date'
import type { Cents } from '../lib/money'
import type { CardFunction, CategoryOrigin, ExpenseMode, Id, PaymentMethod, User } from '../data/types'
import type { GoalDirection, GoalMetricType } from '../lib/goals'
import type { CycleStatus, EntryKind, PaymentStatus } from '../data/selectors'

export type { User }
export type { GoalDirection, GoalMetricType }

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

/** Fatura do ciclo aberto agora: a que recebe uma compra feita hoje. */
export interface CardCurrentInvoice {
  /** Nulo enquanto o ciclo ainda não tiver compras. */
  id: Id | null
  cycleMonth: CivilDate
  cycleLabel: string
  closingDate: CivilDate
  dueDate: CivilDate
  total: Cents
  paid: Cents
  remaining: Cents
  payment: PaymentStatus
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
  /** Só existe em cartão com função crédito. */
  currentInvoice: CardCurrentInvoice | null
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
  /** Data e hora do cadastro; desempata a ordenação por data do lançamento. */
  createdAt: string
  description: string
  categoryLabel: string | null
  categoryArchived: boolean
  accountName: string
  cardName: string | null
  method: PaymentMethod | null
  amount: Cents
  editable: boolean
  /** Cobrança recorrente calculada para o período, ainda não faturada. */
  projected: boolean
  /** Regra de origem quando a linha representa uma previsão recorrente. */
  recurringRuleId: Id | null
  /** Compromisso pessoal de origem quando a linha é uma previsão de pagamento. */
  personalCommitmentId: Id | null
  beneficiaryName: string | null
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
    /** Saldo das faturas cujos ciclos ainda estão abertos. */
    openInvoices: Cents
    /** Saldo das faturas não pagas que já passaram do vencimento. */
    overdueInvoices: Cents
  }
  period: {
    income: Cents
    expense: Cents
    realizedExpense: Cents
    projectedExpense: Cents
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
  /** Elegível ao registro de pagamento, integral ou parcial. */
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
  /** Nulo cria a categoria disponível em todas as contas do usuário. */
  accountId: Id | null
}

export interface InvoicePaymentInput {
  invoiceId: Id
  accountId: Id | null
  date: CivilDate
  /** Ausente quita o valor restante; informado registra pagamento parcial. */
  amount?: Cents | null
}

export type WishPriority = 'baixa' | 'media' | 'alta'
export type WishStatus = 'desejado' | 'planejado' | 'comprado' | 'arquivado'
export type PlannedExpenseStatus = 'planejado' | 'realizado' | 'cancelado'

export interface WishItem {
  id: Id
  description: string
  estimatedAmount: Cents
  desiredDate: CivilDate | null
  priority: WishPriority
  productUrl: string | null
  notes: string | null
  status: WishStatus
}

export interface WishInput {
  description: string
  estimatedAmount: Cents
  desiredDate: CivilDate | null
  priority: WishPriority
  productUrl: string | null
  notes: string | null
}

export interface PlannedExpense {
  id: Id
  wishItemId: Id | null
  accountId: Id
  accountName: string
  cardId: Id | null
  cardName: string | null
  categoryId: Id
  categoryName: string
  description: string
  amount: Cents
  plannedDate: CivilDate
  method: PaymentMethod
  expenseMode: 'unica' | 'parcelada'
  installmentCount: number | null
  includedInSimulation: boolean
  status: PlannedExpenseStatus
  actualPurchaseDate: CivilDate | null
  realizedTransactionId: Id | null
}

export interface PlannedExpenseInput {
  wishItemId: Id | null
  accountId: Id | null
  cardId: Id | null
  categoryId: Id | null
  description: string
  amount: Cents
  plannedDate: CivilDate
  method: PaymentMethod
  expenseMode: 'unica' | 'parcelada'
  installmentCount: number | null
  includedInSimulation: boolean
}

export type PersonalCommitmentSchedule = 'parcelado' | 'recorrente'
export type PersonalCommitmentStatus = 'ativo' | 'pausado' | 'concluido' | 'cancelado'
export type CommitmentOccurrenceStatus = 'pago' | 'atrasado' | 'previsto'

export interface PersonalCommitment {
  id: Id
  beneficiaryName: string
  description: string
  amount: Cents
  accountId: Id
  accountName: string
  cardId: Id | null
  cardName: string | null
  categoryId: Id
  categoryName: string
  method: PaymentMethod
  schedule: PersonalCommitmentSchedule
  startDate: CivilDate
  installmentCount: number | null
  endDate: CivilDate | null
  includedInSimulation: boolean
  status: PersonalCommitmentStatus
  paidOccurrences: number
}

export interface PersonalCommitmentInput {
  beneficiaryName: string
  description: string
  amount: Cents
  accountId: Id | null
  cardId: Id | null
  categoryId: Id | null
  method: PaymentMethod
  schedule: PersonalCommitmentSchedule
  startDate: CivilDate
  installmentCount: number | null
  endDate: CivilDate | null
  includedInSimulation: boolean
}

export interface CommitmentOccurrence {
  id: string
  commitmentId: Id
  beneficiaryName: string
  description: string
  scheduledDate: CivilDate
  amount: Cents
  installmentNumber: number | null
  installmentCount: number | null
  status: CommitmentOccurrenceStatus
  paymentDate: CivilDate | null
  transactionId: Id | null
  includedInSimulation: boolean
}

export interface PlanningSimulation {
  selectedCount: number
  totalPlanned: Cents
  currentBalance: Cents
  balanceAfterPurchases: Cents
  balanceAfterAllPayments: Cents
  accounts: Array<{
    id: Id
    name: string
    currentBalance: Cents
    immediateOutflow: Cents
    futureCardPayments: Cents
    balanceAfterPurchases: Cents
    balanceAfterAllPayments: Cents
  }>
  cards: Array<{
    id: Id
    name: string
    currentAvailable: Cents | null
    plannedCommitment: Cents
    projectedAvailable: Cents | null
  }>
  timeline: Array<{
    plannedExpenseId: Id
    description: string
    date: CivilDate
    amount: Cents
    kind: 'compra' | 'pagamento-cartao'
    installmentNumber: number | null
    installmentCount: number | null
  }>
  warnings: string[]
}

/* ----------------------------------- Metas ---------------------------------- */

export type GoalCycleStatus = 'planejado' | 'ativo' | 'encerrado'
export type GoalObjectiveStatus = 'ativo' | 'alcancado' | 'abandonado'
export type GoalCycleType = 'personalizado' | 'anual' | 'semestral' | 'trimestral'
export type GoalSourceType = 'manual' | 'habits'
export type GoalAggregation = 'dias-concluidos' | 'ocorrencias' | 'soma' | 'duracao'
export type GoalEvaluationMode = 'total' | 'recorrente'
export type GoalCadence = 'diaria' | 'semanal' | 'mensal'

export interface GoalSourceBinding {
  sourceType: GoalSourceType
  sourceIds: Id[]
  aggregation: GoalAggregation
  evaluationMode: GoalEvaluationMode
  cadence: GoalCadence | null
  targetPerWindow: number | null
  allowCarryover: boolean
}

export interface GoalCycleSummary {
  id: Id
  name: string
  startDate: CivilDate
  endDate: CivilDate
  /** Percentual aceito de distância do alvo, declarado antes do resultado. */
  expectedErrorMargin: number
  status: GoalCycleStatus
  note: string | null
  realErrorMargin: number
  projectedErrorMargin: number
  /** Positivo quando o ciclo está pior que o esperado. */
  deviation: number
  withinMargin: boolean
  elapsedFraction: number
  objectiveCount: number
  cycleType?: GoalCycleType
  parentCycleId?: Id | null
}

export interface GoalObjectiveRow {
  id: Id
  title: string
  description: string | null
  metricType: GoalMetricType
  direction: GoalDirection
  baselineValue: number
  targetValue: number
  currentValue: number
  unit: string | null
  weight: number
  expectedErrorMargin: number
  /** De 0 a 1; superar o alvo não credita acima de 100%. */
  attainment: number
  errorPercent: number
  withinMargin: boolean
  status: GoalObjectiveStatus
  sourceType?: GoalSourceType
  evaluationMode?: GoalEvaluationMode
  cadence?: GoalCadence | null
  currentWindow?: { actual: number; target: number } | null
}

export interface GoalCycleDetail extends GoalCycleSummary {
  objectives: GoalObjectiveRow[]
}

export interface GoalCycleInput {
  name: string
  startDate: CivilDate
  endDate: CivilDate
  expectedErrorMargin: number
  note: string | null
  cycleType?: GoalCycleType
  parentCycleId?: Id | null
}

export interface GoalObjectiveInput {
  title: string
  description: string | null
  metricType: GoalMetricType
  direction: GoalDirection
  baselineValue: number
  targetValue: number
  unit: string | null
  weight: number
  expectedErrorMargin: number | null
  parentObjectiveId?: Id | null
  sourceBinding?: GoalSourceBinding | null
}

export interface GoalObjectiveRecord extends GoalObjectiveInput {
  id: Id
  cycleId: Id
  currentValue: number
  status: GoalObjectiveStatus
  /** Janela do ciclo: o registro de progresso só aceita datas dentro dela. */
  cycleStartDate: CivilDate
  cycleEndDate: CivilDate
  cycleStatus: GoalCycleStatus
  sourceBinding?: GoalSourceBinding | null
}

export interface GoalProgressInput {
  occurredOn: CivilDate
  value: number
  note: string | null
}

export interface GoalProgressEntry extends GoalProgressInput {
  id: Id
}

/* ---------------------------------- Habits --------------------------------- */

export type HabitMeasurementType = 'check' | 'contagem' | 'duracao'
export type HabitItemState = 'planejado' | 'ignorado'

export interface HabitDefinition {
  id: Id
  name: string
  description: string | null
  color: string | null
  measurementType: HabitMeasurementType
  unit: string | null
  defaultDailyTarget: number
  active: boolean
}

export interface HabitInput {
  name: string
  description: string | null
  color: string | null
  measurementType: HabitMeasurementType
  unit: string | null
  defaultDailyTarget: number
}

export interface HabitActivityRecord {
  id: Id
  value: number
  startedAt: string | null
  endedAt: string | null
  note: string | null
}

export interface HabitDailyItem {
  id: Id
  plannedOn: CivilDate
  habitId: Id | null
  title: string
  measurementType: HabitMeasurementType
  targetValue: number
  currentValue: number
  unit: string | null
  position: number
  state: HabitItemState
  completed: boolean
  records: HabitActivityRecord[]
}

export interface HabitDay {
  date: CivilDate
  planned: number
  completed: number
  completionRate: number
  items: HabitDailyItem[]
}

export interface HabitDailyItemInput {
  habitId?: Id
  title?: string
  measurementType?: HabitMeasurementType
  targetValue?: number
  unit?: string | null
}

export interface HabitRecordInput {
  value?: number
  startedAt?: string
  endedAt?: string
  note: string | null
}

export interface HabitStats {
  from: CivilDate
  to: CivilDate
  planned: number
  completed: number
  skipped: number
  adherence: number
  activeDays: number
  durationMinutes: number
  countValue: number
  habits: Array<{
    habitId: Id | null
    name: string
    planned: number
    completed: number
    adherence: number
    activeDays: number
    durationMinutes: number
    countValue: number
  }>
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
  deleteIncome(id: Id): Promise<void>
  createExpense(input: ExpenseInput): Promise<void>
  updateExpense(id: Id, input: ExpenseInput): Promise<void>
  deleteExpense(id: Id): Promise<void>
  getRecurringExpense(id: Id): Promise<ExpenseInput>
  updateRecurringExpense(id: Id, input: ExpenseInput): Promise<void>
  cancelRecurringExpense(id: Id): Promise<void>
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
  rename(id: Id, input: CategoryInput): Promise<CategoryRow>
  archive(id: Id): Promise<void>
}

export interface PlanningService {
  listWishes(): Promise<WishItem[]>
  getWish(id: Id): Promise<WishItem>
  createWish(input: WishInput): Promise<WishItem>
  updateWish(id: Id, input: WishInput): Promise<WishItem>
  archiveWish(id: Id): Promise<void>
  listPlannedExpenses(params: ScopeParams): Promise<PlannedExpense[]>
  getPlannedExpense(id: Id): Promise<PlannedExpense>
  createPlannedExpense(input: PlannedExpenseInput): Promise<PlannedExpense>
  updatePlannedExpense(id: Id, input: PlannedExpenseInput): Promise<PlannedExpense>
  cancelPlannedExpense(id: Id): Promise<void>
  realizePlannedExpense(id: Id, input: { purchaseDate: CivilDate; actualAmount?: Cents }): Promise<PlannedExpense>
  listCommitments(params: ScopeParams): Promise<PersonalCommitment[]>
  getCommitment(id: Id): Promise<PersonalCommitment>
  createCommitment(input: PersonalCommitmentInput): Promise<PersonalCommitment>
  updateCommitment(id: Id, input: PersonalCommitmentInput): Promise<PersonalCommitment>
  pauseCommitment(id: Id): Promise<PersonalCommitment>
  resumeCommitment(id: Id): Promise<PersonalCommitment>
  cancelCommitment(id: Id): Promise<void>
  listCommitmentOccurrences(
    params: ScopeParams & { start: CivilDate; end: CivilDate },
  ): Promise<CommitmentOccurrence[]>
  registerCommitmentPayment(
    id: Id,
    scheduledDate: CivilDate,
    input: { paymentDate: CivilDate; actualAmount?: Cents },
  ): Promise<void>
  simulate(params: ScopeParams): Promise<PlanningSimulation>
}

export interface GoalsService {
  listCycles(): Promise<GoalCycleSummary[]>
  getCycle(id: Id): Promise<GoalCycleDetail>
  createCycle(input: GoalCycleInput): Promise<Id>
  updateCycle(id: Id, input: GoalCycleInput): Promise<void>
  closeCycle(id: Id): Promise<void>
  reopenCycle(id: Id): Promise<void>
  deleteCycle(id: Id): Promise<void>
  getObjective(id: Id): Promise<GoalObjectiveRecord>
  createObjective(cycleId: Id, input: GoalObjectiveInput): Promise<void>
  updateObjective(id: Id, input: GoalObjectiveInput): Promise<void>
  abandonObjective(id: Id): Promise<void>
  deleteObjective(id: Id): Promise<void>
  listProgress(objectiveId: Id): Promise<GoalProgressEntry[]>
  addProgress(objectiveId: Id, input: GoalProgressInput): Promise<void>
  deleteProgress(id: Id): Promise<void>
}

export interface HabitsService {
  list(includeArchived?: boolean): Promise<HabitDefinition[]>
  create(input: HabitInput): Promise<Id>
  update(id: Id, input: HabitInput & { active?: boolean }): Promise<void>
  day(date: CivilDate): Promise<HabitDay>
  addItem(date: CivilDate, input: HabitDailyItemInput): Promise<void>
  updateItem(id: Id, input: { state?: HabitItemState; plannedOn?: CivilDate; targetValue?: number }): Promise<void>
  deleteItem(id: Id): Promise<void>
  addRecord(itemId: Id, input: HabitRecordInput): Promise<void>
  deleteRecord(id: Id): Promise<void>
  stats(from: CivilDate, to: CivilDate, habitId?: Id): Promise<HabitStats>
}

export interface Services {
  auth: AuthService
  overview: OverviewService
  accounts: AccountsService
  transactions: TransactionsService
  cards: CardsService
  invoices: InvoicesService
  categories: CategoriesService
  planning: PlanningService
  goals: GoalsService
  habits: HabitsService
}
