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
  period: { incomes: string; expenses: string; result: string }
  expensesByCategory: ApiBreakdownItem[]
  expensesByPaymentMethod: ApiBreakdownItem[]
}
