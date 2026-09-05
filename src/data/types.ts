import type { Cents } from '../lib/money'
import type { CivilDate } from '../lib/date'

export type Id = string

export type PaymentMethod = 'pix' | 'boleto' | 'debito' | 'credito'
export type ExpenseMode = 'unica' | 'parcelada' | 'recorrente'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  debito: 'Cartão de débito',
  credito: 'Cartão de crédito',
}

export const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  debito: 'Débito',
  credito: 'Crédito',
}

export interface User {
  id: Id
  name: string
  email: string
}

export interface Account {
  id: Id
  ownerId: Id
  name: string
  initialBalance: Cents
  referenceDate: CivilDate
  createdAt: CivilDate
}

export type CardFunction = 'credito' | 'debito' | 'ambas'

export const CARD_FUNCTION_LABEL: Record<CardFunction, string> = {
  credito: 'Crédito',
  debito: 'Débito',
  ambas: 'Crédito e débito',
}

export interface Card {
  id: Id
  ownerId: Id
  accountId: Id
  name: string
  functions: CardFunction
  color: string
  /** Somente quando a função crédito estiver habilitada. */
  creditLimit: Cents | null
  closingDay: number | null
  dueDay: number | null
}

export type CategoryOrigin = 'padrao' | 'personalizada'

export interface Category {
  id: Id
  name: string
  origin: CategoryOrigin
  /** Personalizadas pertencem a uma única conta financeira (SDD 4.7). */
  ownerId: Id | null
  accountId: Id | null
  archived: boolean
}

export interface Income {
  id: Id
  ownerId: Id
  description: string
  amount: Cents
  accountId: Id
  date: CivilDate
}

export interface Expense {
  id: Id
  ownerId: Id
  description: string
  amount: Cents
  date: CivilDate
  method: PaymentMethod
  /** Conta à qual o gasto pertence, inclusive no crédito (SDD 4.4). */
  accountId: Id
  cardId: Id | null
  categoryId: Id
  invoiceId: Id | null
}

export interface Invoice {
  id: Id
  ownerId: Id
  cardId: Id
  /** Rótulo do ciclo, por exemplo "Outubro de 2026". */
  cycleLabel: string
  periodStart: CivilDate
  periodEnd: CivilDate
  closingDate: CivilDate
  dueDate: CivilDate
}

export interface InvoicePayment {
  id: Id
  ownerId: Id
  invoiceId: Id
  accountId: Id
  amount: Cents
  date: CivilDate
}

export interface FinanceState {
  users: User[]
  accounts: Account[]
  cards: Card[]
  categories: Category[]
  incomes: Income[]
  expenses: Expense[]
  invoices: Invoice[]
  invoicePayments: InvoicePayment[]
}
