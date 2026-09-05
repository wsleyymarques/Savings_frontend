import { formatMonthLabel } from '../../lib/date'
import type { Cents } from '../../lib/money'
import type { CardFunction, CategoryOrigin, ExpenseMode, PaymentMethod } from '../../data/types'
import type { CycleStatus, EntryKind, PaymentStatus } from '../../data/selectors'
import type {
  AccountSummary,
  CardSummary,
  CategoryRow,
  CreditPurchase,
  EntryRow,
  InvoiceSummary,
} from '../contracts'
import type {
  ApiAccount,
  ApiCard,
  ApiCardFunction,
  ApiCategory,
  ApiInvoice,
  ApiPaymentMethod,
  ApiExpenseEntryMode,
  ApiTransaction,
  ApiTransactionType,
} from './apiTypes'

/* --------------------------------- Dinheiro -------------------------------- */

/**
 * A API transporta dinheiro como string decimal de duas casas ("300.00") e o
 * frontend trabalha em centavos inteiros. A conversão é feita por texto para
 * não passar por ponto flutuante.
 */
export function decimalToCents(value: string | null | undefined): Cents {
  if (!value) return 0
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) return 0
  const [, sign, whole, fraction = ''] = match
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return sign === '-' ? -cents : cents
}

export function centsToDecimal(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(cents))
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`
}

/* ------------------------------- Enumerações ------------------------------- */

const METHOD_FROM_API: Record<ApiPaymentMethod, PaymentMethod> = {
  PIX: 'pix',
  BOLETO: 'boleto',
  DEBIT: 'debito',
  CREDIT: 'credito',
}

const METHOD_TO_API: Record<PaymentMethod, ApiPaymentMethod> = {
  pix: 'PIX',
  boleto: 'BOLETO',
  debito: 'DEBIT',
  credito: 'CREDIT',
}

const FUNCTION_FROM_API: Record<ApiCardFunction, CardFunction> = {
  CREDIT: 'credito',
  DEBIT: 'debito',
  BOTH: 'ambas',
}

const FUNCTION_TO_API: Record<CardFunction, ApiCardFunction> = {
  credito: 'CREDIT',
  debito: 'DEBIT',
  ambas: 'BOTH',
}

const KIND_FROM_API: Record<'DEFAULT' | 'CUSTOM', CategoryOrigin> = {
  DEFAULT: 'padrao',
  CUSTOM: 'personalizada',
}

const TYPE_FROM_API: Record<ApiTransactionType, EntryKind> = {
  INCOME: 'receita',
  EXPENSE: 'despesa',
  INVOICE_PAYMENT: 'pagamento',
}

const MODE_FROM_API: Record<ApiExpenseEntryMode, ExpenseMode> = {
  ONE_TIME: 'unica',
  INSTALLMENT: 'parcelada',
  RECURRING: 'recorrente',
}

export function modeToApi(value: ExpenseMode): ApiExpenseEntryMode {
  if (value === 'parcelada') return 'INSTALLMENT'
  if (value === 'recorrente') return 'RECURRING'
  return 'ONE_TIME'
}

export function methodFromApi(value: ApiPaymentMethod | null): PaymentMethod | null {
  return value ? METHOD_FROM_API[value] : null
}

export function methodToApi(value: PaymentMethod): ApiPaymentMethod {
  return METHOD_TO_API[value]
}

export function functionFromApi(value: ApiCardFunction): CardFunction {
  return FUNCTION_FROM_API[value]
}

export function functionToApi(value: CardFunction): ApiCardFunction {
  return FUNCTION_TO_API[value]
}

/* ---------------------------------- Mapas ---------------------------------- */

export function toAccountSummary(account: ApiAccount): AccountSummary {
  return {
    id: account.id,
    name: account.name,
    initialBalance: decimalToCents(account.initialBalance),
    referenceDate: account.referenceDate,
    currentBalance: decimalToCents(account.currentBalance),
  }
}

export function toCardSummary(card: ApiCard, accounts: AccountSummary[]): CardSummary {
  const account = accounts.find((item) => item.id === card.accountId)
  const limit = card.creditLimit === null ? null : decimalToCents(card.creditLimit)
  return {
    id: card.id,
    name: card.name,
    accountId: card.accountId,
    accountName: card.account?.name ?? account?.name ?? '—',
    accountBalance: account?.currentBalance ?? 0,
    functions: functionFromApi(card.function),
    // A API normaliza a cor em maiúsculas; os tokens do frontend usam minúsculas.
    color: card.color.toLowerCase(),
    creditLimit: limit,
    committed: decimalToCents(card.committedAmount),
    available: card.availableLimit === null ? 0 : decimalToCents(card.availableLimit),
    closingDay: card.closingDay,
    dueDay: card.dueDay,
  }
}

export function toCategoryRow(category: ApiCategory): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    origin: KIND_FROM_API[category.kind],
    accountId: category.accountId,
    accountName: category.account?.name ?? null,
    archived: category.archivedAt !== null,
  }
}

export function toEntryRow(transaction: ApiTransaction): EntryRow {
  const kind = TYPE_FROM_API[transaction.type]
  const amount = decimalToCents(transaction.amount)
  return {
    id: `${kind}-${transaction.id}`,
    kind,
    sourceId: transaction.id,
    date: transaction.effectiveDate,
    description: transaction.description,
    categoryLabel: transaction.category?.name ?? null,
    categoryArchived: Boolean(transaction.category?.archivedAt),
    accountName: transaction.account?.name ?? '—',
    cardName: transaction.card?.name ?? null,
    method: methodFromApi(transaction.paymentMethod),
    amount: kind === 'receita' ? amount : -amount,
    // A API da V1 não expõe edição de lançamento: as regras de correção
    // continuam abertas no SDD, então a ação não é oferecida.
    editable: false,
    expenseMode: MODE_FROM_API[transaction.entryMode ?? 'ONE_TIME'],
    installmentNumber: transaction.installmentNumber,
    installmentCount: transaction.installmentCount,
  }
}

export function toCreditPurchase(transaction: ApiTransaction): CreditPurchase {
  return {
    id: transaction.id,
    date: transaction.installmentPurchase?.purchaseDate ?? transaction.effectiveDate,
    description: transaction.description,
    categoryName: transaction.category?.name ?? 'Sem categoria',
    amount: decimalToCents(transaction.amount),
    expenseMode: MODE_FROM_API[transaction.entryMode ?? 'ONE_TIME'],
    installmentNumber: transaction.installmentNumber,
    installmentCount: transaction.installmentCount,
  }
}

export function toInvoiceSummary(invoice: ApiInvoice): InvoiceSummary {
  const cycle: CycleStatus = invoice.effectiveCycleStatus === 'CLOSED' ? 'fechada' : 'aberta'
  const payment: PaymentStatus = invoice.paymentStatus === 'PAID' ? 'paga' : 'nao-paga'
  const total = decimalToCents(invoice.totalAmount)
  const remaining = decimalToCents(invoice.remainingAmount)

  return {
    id: invoice.id,
    cardId: invoice.cardId,
    cardName: invoice.card?.name ?? 'Cartão',
    cycleMonth: invoice.cycleMonth.slice(0, 10),
    cycleLabel: formatMonthLabel(invoice.cycleMonth.slice(0, 10)),
    // A API expõe o ciclo pelo mês e pelo fechamento; o início do período é
    // apresentado a partir do fechamento anterior informado pelo cartão.
    periodStart: invoice.cycleMonth.slice(0, 10),
    periodEnd: invoice.closingDate,
    closingDate: invoice.closingDate,
    dueDate: invoice.dueDate,
    total,
    paid: decimalToCents(invoice.paidAmount),
    remaining,
    cycle,
    payment,
    payable: cycle === 'fechada' && payment !== 'paga' && remaining > 0,
  }
}
