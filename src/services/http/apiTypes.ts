/** Tipos devolvidos pela API NestJS (`backend/`), no formato original. */

export type ApiCardFunction = 'CREDIT' | 'DEBIT' | 'BOTH'
export type ApiPaymentMethod = 'PIX' | 'BOLETO' | 'DEBIT' | 'CREDIT'
export type ApiTransactionType = 'INCOME' | 'EXPENSE' | 'INVOICE_PAYMENT'
export type ApiExpenseEntryMode = 'ONE_TIME' | 'INSTALLMENT' | 'RECURRING'
export type ApiCategoryKind = 'DEFAULT' | 'CUSTOM'
export type ApiCycleStatus = 'OPEN' | 'CLOSED'
export type ApiPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'

export interface ApiUser {
  id: string
  name: string
  email: string
}

export interface ApiAuthResponse {
  accessToken: string
  tokenType: 'Bearer'
  user: ApiUser
}

export interface ApiAccount {
  id: string
  name: string
  /** Decimal com duas casas, por exemplo "1000.00". */
  initialBalance: string
  referenceDate: string
  currentBalance: string
}

export interface ApiCard {
  id: string
  accountId: string
  account?: { id: string; name: string } | null
  name: string
  function: ApiCardFunction
  creditLimit: string | null
  closingDay: number | null
  dueDay: number | null
  color: string
  imageKey: string | null
  committedAmount: string
  availableLimit: string | null
}

export interface ApiCategory {
  id: string
  name: string
  kind: ApiCategoryKind
  accountId: string | null
  account?: { id: string; name: string } | null
  archivedAt: string | null
}

export interface ApiTransaction {
  id: string
  accountId: string
  account?: { id: string; name: string } | null
  cardId: string | null
  card?: { id: string; name: string } | null
  categoryId: string | null
  category?: { id: string; name: string; archivedAt: string | null } | null
  invoiceId: string | null
  type: ApiTransactionType
  paymentMethod: ApiPaymentMethod | null
  description: string
  amount: string
  effectiveDate: string
  entryMode: ApiExpenseEntryMode
  installmentPurchaseId: string | null
  installmentNumber: number | null
  installmentCount: number | null
  recurringRuleId: string | null
  installmentPurchase?: { id: string; purchaseDate: string; totalAmount: string } | null
  recurringRule?: { id: string; status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' } | null
  projected?: boolean
  personalCommitmentId?: string | null
  beneficiaryName?: string | null
}

export interface ApiRecurringExpenseRule {
  id: string
  cardId: string
  categoryId: string
  description: string
  amount: string
  startDate: string
  endDate: string | null
  nextOccurrenceDate: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
}

export interface ApiInvoice {
  id: string
  cardId: string
  card?: { id: string; name: string; accountId: string } | null
  cycleMonth: string
  closingDate: string
  dueDate: string
  cycleStatus: ApiCycleStatus
  effectiveCycleStatus: ApiCycleStatus
  paymentStatus: ApiPaymentStatus
  totalAmount: string
  paidAmount: string
  remainingAmount: string
  paymentAccountId: string | null
  paymentAccount?: { id: string; name: string } | null
  paidAt: string | null
  transactions?: ApiTransaction[]
}

export interface ApiBreakdownItem {
  key: string
  label: string
  amount: string
}

export interface ApiOverview {
  scope: { accountId: string | null; from: string | null; to: string | null }
  position: {
    accountsBalance: string
    totalCreditLimit: string
    committedCredit: string
    availableCredit: string
    unpaidInvoices: string
  }
  period: {
    incomes: string
    expenses: string
    realizedExpenses?: string
    projectedExpenses?: string
    result: string
  }
  expensesByCategory: ApiBreakdownItem[]
  expensesByPaymentMethod: ApiBreakdownItem[]
}

export interface ApiWishItem {
  id: string
  description: string
  estimatedAmount: string
  desiredDate: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  productUrl: string | null
  notes: string | null
  status: 'WANTED' | 'PLANNED' | 'PURCHASED' | 'ARCHIVED'
}

export interface ApiPlannedExpense {
  id: string
  wishItemId: string | null
  accountId: string
  account?: { id: string; name: string } | null
  cardId: string | null
  card?: { id: string; name: string } | null
  categoryId: string
  category?: { id: string; name: string } | null
  description: string
  amount: string
  plannedDate: string
  paymentMethod: ApiPaymentMethod
  entryMode: 'ONE_TIME' | 'INSTALLMENT'
  installmentCount: number | null
  includedInSimulation: boolean
  status: 'PLANNED' | 'REALIZED' | 'CANCELLED'
  actualPurchaseDate: string | null
  realizedTransactionId: string | null
}

export interface ApiPersonalCommitment {
  id: string
  beneficiaryName: string
  description: string
  amount: string
  accountId: string
  account?: { id: string; name: string } | null
  cardId: string | null
  card?: { id: string; name: string } | null
  categoryId: string
  category?: { id: string; name: string } | null
  paymentMethod: ApiPaymentMethod
  scheduleType: 'INSTALLMENT' | 'RECURRING'
  startDate: string
  installmentCount: number | null
  endDate: string | null
  includedInSimulation: boolean
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  paidOccurrences: number
}

export interface ApiCommitmentOccurrence {
  id: string
  commitmentId: string
  beneficiaryName: string
  description: string
  scheduledDate: string
  amount: string
  installmentNumber: number | null
  installmentCount: number | null
  status: 'PAID' | 'OVERDUE' | 'UPCOMING'
  paymentDate: string | null
  transactionId: string | null
  includedInSimulation: boolean
}

export interface ApiPlanningSimulation {
  selectedCount: number
  totalPlanned: string
  currentBalance: string
  balanceAfterPurchases: string
  balanceAfterAllPayments: string
  accounts: Array<{
    id: string
    name: string
    currentBalance: string
    immediateOutflow: string
    futureCardPayments: string
    balanceAfterPurchases: string
    balanceAfterAllPayments: string
  }>
  cards: Array<{
    id: string
    name: string
    currentAvailable: string | null
    plannedCommitment: string
    projectedAvailable: string | null
  }>
  timeline: Array<{
    plannedExpenseId: string
    description: string
    date: string
    amount: string
    kind: 'PURCHASE' | 'CARD_PAYMENT'
    installmentNumber: number | null
    installmentCount: number | null
  }>
  warnings: string[]
}

/* ----------------------------------- Metas ---------------------------------- */

export type ApiGoalCycleStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED'
export type ApiGoalMetricType = 'COMPLETION' | 'COUNT' | 'AMOUNT' | 'PERCENT'
export type ApiGoalDirection = 'INCREASE' | 'DECREASE'
export type ApiGoalObjectiveStatus = 'ACTIVE' | 'ACHIEVED' | 'ABANDONED'

export interface ApiGoalCycle {
  id: string
  name: string
  startDate: string
  endDate: string
  expectedErrorMargin: string
  status: ApiGoalCycleStatus
  closedAt: string | null
  note: string | null
}

export interface ApiGoalSummary {
  expectedErrorMargin: string
  realErrorMargin: string
  projectedErrorMargin: string
  deviation: string
  withinMargin: boolean
  elapsedFraction: string
  objectiveCount: number
}

export interface ApiGoalObjectiveResult {
  id: string
  title: string
  metricType: ApiGoalMetricType
  direction: ApiGoalDirection
  baselineValue: string
  targetValue: string
  currentValue: string
  unit: string | null
  weight: string
  attainment: string
  errorPercent: string
  expectedErrorMargin: string
  withinMargin: boolean
  status: ApiGoalObjectiveStatus
}

export interface ApiGoalObjective {
  id: string
  cycleId: string
  title: string
  description: string | null
  metricType: ApiGoalMetricType
  direction: ApiGoalDirection
  baselineValue: string
  targetValue: string
  currentValue: string
  unit: string | null
  weight: string
  expectedErrorMargin: string | null
  status: ApiGoalObjectiveStatus
  cycleStartDate: string
  cycleEndDate: string
  cycleStatus: ApiGoalCycleStatus
}

export interface ApiGoalCycleResult {
  cycle: ApiGoalCycle
  objectives: ApiGoalObjectiveResult[]
  summary: ApiGoalSummary
}

export interface ApiGoalCycleRow {
  cycle: ApiGoalCycle
  summary: ApiGoalSummary
}

export interface ApiGoalProgressEntry {
  id: string
  objectiveId: string
  occurredOn: string
  value: string
  note: string | null
}
