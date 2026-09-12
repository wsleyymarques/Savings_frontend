import { isValidCivilDate, type CivilDate } from '../../lib/date'
import { DataError, ValidationError } from '../errors'
import {
  cardHasCredit,
  cardHasDebit,
  findAccount,
  findCard,
  findCategory,
  findInvoice,
  invoiceTotals,
  isCategoryValidForAccount,
  normalizeCategoryName,
  resolveInvoiceCycle,
  selectableCategories,
} from '../../data/selectors'
import { defaultCategories, emptyState, FIXTURE_TODAY, seedState } from '../../data/seed'
import type { Category, FinanceState, Id, User } from '../../data/types'
import type {
  AccountInput,
  CardInput,
  CategoryInput,
  ChangePasswordInput,
  ExpenseInput,
  IncomeInput,
  InvoicePaymentInput,
  SignInInput,
  SignUpInput,
} from '../contracts'

const STORAGE_KEY = 'minhas-financas:estado'
const SESSION_KEY = 'minhas-financas:sessao'
const READ_LATENCY = 180
const WRITE_LATENCY = 280

/**
 * Estado do adaptador mockado: em memória, determinístico e sem contrato HTTP.
 *
 * Senhas não são persistidas nem embarcadas no bundle. Enquanto a autenticação
 * real não existe, o login aceita qualquer senha com o formato válido do SDD
 * (8 a 128 caracteres) para um e-mail já cadastrado. É um substituto de
 * protótipo, não um mecanismo de segurança.
 */
export class MockStore {
  private state: FinanceState
  private currentUserId: Id | null
  private sequence = 0
  private readonly failing: boolean

  constructor(options: { failing?: boolean } = {}) {
    this.failing = options.failing ?? false
    this.state = readStored<FinanceState>(STORAGE_KEY) ?? seedState()
    this.currentUserId = readStored<Id>(SESSION_KEY)
  }

  get today(): CivilDate {
    return FIXTURE_TODAY
  }

  /** Estado já recortado pelo proprietário da sessão (CA-01). */
  async snapshot(): Promise<FinanceState> {
    await this.read()
    return this.scopedState()
  }

  /** Leitura sem latência, para composições internas do adaptador. */
  peek(): FinanceState {
    return this.scopedState()
  }

  requireUser(): Id {
    if (!this.currentUserId) throw new DataError('Sessão expirada. Entre novamente.')
    return this.currentUserId
  }

  /* ------------------------------- Sessão -------------------------------- */

  async restoreSession(): Promise<User | null> {
    await this.wait(READ_LATENCY)
    if (!this.currentUserId) return null
    return this.state.users.find((user) => user.id === this.currentUserId) ?? null
  }

  async signIn({ email, password }: SignInInput): Promise<User> {
    await this.wait(WRITE_LATENCY)
    const fields: Record<string, string> = {}
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) fields.email = 'Informe o e-mail.'
    if (!password) fields.password = 'Informe a senha.'
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    const user = this.state.users.find((item) => item.email === normalizedEmail)
    if (!user || password.length < 8 || password.length > 128) {
      throw new ValidationError({}, 'E-mail ou senha inválidos.')
    }
    this.currentUserId = user.id
    writeStored(SESSION_KEY, user.id)
    return user
  }

  async signUp({ name, email, password }: SignUpInput): Promise<User> {
    await this.wait(WRITE_LATENCY)
    const trimmedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const fields: Record<string, string> = {}

    if (trimmedName.length < 1 || trimmedName.length > 100) {
      fields.name = 'Informe um nome de 1 a 100 caracteres.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      fields.email = 'Informe um e-mail válido.'
    } else if (this.state.users.some((user) => user.email === normalizedEmail)) {
      fields.email = 'Este e-mail já está cadastrado.'
    }
    if (password.length < 8 || password.length > 128) {
      fields.password = 'A senha deve ter de 8 a 128 caracteres.'
    }
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    const user: User = { id: this.nextId('user'), name: trimmedName, email: normalizedEmail }
    this.state = { ...this.state, users: [...this.state.users, user] }
    this.persist()
    this.currentUserId = user.id
    writeStored(SESSION_KEY, user.id)
    return user
  }

  async signOut(): Promise<void> {
    await this.wait(120)
    this.currentUserId = null
    clearStored(SESSION_KEY)
  }

  async updateProfile(name: string): Promise<User> {
    await this.write()
    const ownerId = this.requireUser()
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new ValidationError({ name: 'Informe um nome de 1 a 100 caracteres.' })
    }
    this.state = {
      ...this.state,
      users: this.state.users.map((user) => (user.id === ownerId ? { ...user, name: trimmed } : user)),
    }
    this.persist()
    return this.state.users.find((user) => user.id === ownerId) as User
  }

  async changePassword({ currentPassword, newPassword }: ChangePasswordInput): Promise<void> {
    await this.write()
    this.requireUser()
    const fields: Record<string, string> = {}
    if (currentPassword.length < 8) fields.currentPassword = 'Informe a senha atual.'
    if (newPassword.length < 8 || newPassword.length > 128) {
      fields.newPassword = 'A nova senha deve ter de 8 a 128 caracteres.'
    }
    if (newPassword && newPassword === currentPassword) {
      fields.newPassword = 'A nova senha deve ser diferente da atual.'
    }
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)
    // Sem backend não há hash a atualizar; o SDD define invalidar as sessões.
  }

  /* ------------------------------ Receitas ------------------------------- */

  async createIncome(input: IncomeInput): Promise<void> {
    await this.write()
    const ownerId = this.requireUser()
    const data = this.validateIncome(input)
    this.state = {
      ...this.state,
      incomes: [...this.state.incomes, { id: this.nextId('inc'), ownerId, ...data }],
    }
    this.persist()
  }

  async updateIncome(id: Id, input: IncomeInput): Promise<void> {
    await this.write()
    this.requireUser()
    const data = this.validateIncome(input)
    this.state = {
      ...this.state,
      incomes: this.state.incomes.map((income) => (income.id === id ? { ...income, ...data } : income)),
    }
    this.persist()
  }

  async deleteIncome(id: Id): Promise<void> {
    await this.write()
    this.requireUser()
    this.state = { ...this.state, incomes: this.state.incomes.filter((income) => income.id !== id) }
    this.persist()
  }

  private validateIncome(input: IncomeInput) {
    const fields: Record<string, string> = {}
    const description = input.description.trim()
    if (!description) fields.description = 'Informe uma descrição.'
    if (input.amount <= 0) fields.amount = 'Informe um valor maior que zero.'
    if (!input.accountId) fields.accountId = 'Selecione a conta de destino.'
    else if (!findAccount(this.state, input.accountId)) fields.accountId = 'Conta inválida.'
    if (!isValidCivilDate(input.date)) fields.date = 'Informe uma data válida.'
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    return {
      description,
      amount: input.amount,
      accountId: input.accountId as Id,
      date: input.date,
    }
  }

  /* ------------------------------ Despesas ------------------------------- */

  async createExpense(input: ExpenseInput): Promise<void> {
    await this.write()
    const ownerId = this.requireUser()
    const data = this.validateExpense(input)
    this.state = {
      ...this.state,
      expenses: [...this.state.expenses, { id: this.nextId('exp'), ownerId, ...data }],
    }
    this.persist()
  }

  async updateExpense(id: Id, input: ExpenseInput): Promise<void> {
    await this.write()
    this.requireUser()
    const existing = this.state.expenses.find((expense) => expense.id === id)
    if (!existing) throw new DataError('Lançamento não encontrado.')

    const invoice = findInvoice(this.state, existing.invoiceId)
    if (invoice && invoiceTotals(this.state, invoice, this.today).payment === 'paga') {
      throw new DataError('Compras de uma fatura paga ainda não podem ser corrigidas.')
    }

    const data = this.validateExpense(input)
    this.state = {
      ...this.state,
      expenses: this.state.expenses.map((expense) =>
        expense.id === id ? { ...expense, ...data } : expense,
      ),
    }
    this.persist()
  }

  async deleteExpense(id: Id): Promise<void> {
    await this.write()
    this.requireUser()
    this.state = { ...this.state, expenses: this.state.expenses.filter((expense) => expense.id !== id) }
    this.persist()
  }

  private validateExpense(input: ExpenseInput) {
    const fields: Record<string, string> = {}
    const description = input.description.trim()
    if (!description) fields.description = 'Informe uma descrição.'
    if (input.amount <= 0) fields.amount = 'Informe um valor maior que zero.'
    if (!isValidCivilDate(input.date)) fields.date = 'Informe uma data válida.'

    const usesCard = input.method === 'debito' || input.method === 'credito'
    let accountId: Id | null = input.accountId
    let cardId: Id | null = null

    if (usesCard) {
      const card = findCard(this.state, input.cardId)
      if (!card) {
        fields.cardId = 'Selecione um cartão.'
      } else if (input.method === 'debito' && !cardHasDebit(card)) {
        fields.cardId = 'Este cartão não possui função débito.'
      } else if (input.method === 'credito' && !cardHasCredit(card)) {
        fields.cardId = 'Este cartão não possui função crédito.'
      } else {
        cardId = card.id
        // A compra herda a conta do cartão (SDD 4.5).
        accountId = card.accountId
      }
    } else if (!input.accountId || !findAccount(this.state, input.accountId)) {
      fields.accountId = 'Selecione a conta de origem.'
    }

    const category = findCategory(this.state, input.categoryId)
    if (!input.categoryId) {
      fields.categoryId = 'Selecione uma categoria.'
    } else if (!isCategoryValidForAccount(category, accountId)) {
      fields.categoryId = 'Esta categoria não está disponível para a conta selecionada.'
    }

    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    const invoiceId = input.method === 'credito' ? this.ensureInvoice(cardId as Id, input.date) : null

    return {
      description,
      amount: input.amount,
      date: input.date,
      method: input.method,
      accountId: accountId as Id,
      cardId,
      categoryId: input.categoryId as Id,
      invoiceId,
    }
  }

  /** Encontra ou cria a fatura do ciclo em que a compra entra. */
  private ensureInvoice(cardId: Id, purchaseDate: CivilDate): Id {
    const card = findCard(this.state, cardId)
    if (!card) throw new DataError('Cartão não encontrado.')
    const cycle = resolveInvoiceCycle(card, purchaseDate)
    const existing = this.state.invoices.find(
      (invoice) => invoice.cardId === cardId && invoice.closingDate === cycle.closingDate,
    )
    if (existing) return existing.id

    const invoice = { id: this.nextId('inv'), ownerId: this.requireUser(), cardId, ...cycle }
    this.state = { ...this.state, invoices: [...this.state.invoices, invoice] }
    return invoice.id
  }

  /* -------------------------------- Contas ------------------------------- */

  async createAccount(input: AccountInput): Promise<Id> {
    await this.write()
    const ownerId = this.requireUser()
    const fields: Record<string, string> = {}
    const name = input.name.trim()
    if (name.length < 1 || name.length > 60) fields.name = 'Informe um nome de 1 a 60 caracteres.'
    if (!isValidCivilDate(input.referenceDate)) fields.referenceDate = 'Informe uma data válida.'
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    const id = this.nextId('acc')
    this.state = {
      ...this.state,
      accounts: [
        ...this.state.accounts,
        {
          id,
          ownerId,
          name,
          initialBalance: input.initialBalance,
          referenceDate: input.referenceDate,
          createdAt: input.referenceDate,
        },
      ],
    }
    this.persist()
    return id
  }

  async renameAccount(id: Id, name: string): Promise<void> {
    await this.write()
    this.requireUser()
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 60) {
      throw new ValidationError({ name: 'Informe um nome de 1 a 60 caracteres.' })
    }
    this.state = {
      ...this.state,
      accounts: this.state.accounts.map((account) =>
        account.id === id ? { ...account, name: trimmed } : account,
      ),
    }
    this.persist()
  }

  /* ------------------------------- Cartões ------------------------------- */

  async createCard(input: CardInput): Promise<Id> {
    await this.write()
    const ownerId = this.requireUser()
    const data = this.validateCard(input)
    const id = this.nextId('card')
    this.state = { ...this.state, cards: [...this.state.cards, { id, ownerId, ...data }] }
    this.persist()
    return id
  }

  async updateCard(id: Id, input: CardInput): Promise<void> {
    await this.write()
    this.requireUser()
    const data = this.validateCard(input)
    this.state = {
      ...this.state,
      cards: this.state.cards.map((card) => (card.id === id ? { ...card, ...data } : card)),
    }
    this.persist()
  }

  private validateCard(input: CardInput) {
    const fields: Record<string, string> = {}
    const name = input.name.trim()
    if (name.length < 1 || name.length > 60) fields.name = 'Informe um nome de 1 a 60 caracteres.'
    if (!input.accountId || !findAccount(this.state, input.accountId)) {
      fields.accountId = 'Selecione a conta vinculada.'
    }

    const hasCredit = input.functions === 'credito' || input.functions === 'ambas'
    if (hasCredit) {
      if (input.creditLimit === null || input.creditLimit <= 0) {
        fields.creditLimit = 'Informe o limite de crédito.'
      }
      if (!isDayOfMonth(input.closingDay)) fields.closingDay = 'Informe um dia entre 1 e 31.'
      if (!isDayOfMonth(input.dueDay)) fields.dueDay = 'Informe um dia entre 1 e 31.'
    }
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    return {
      name,
      accountId: input.accountId as Id,
      functions: input.functions,
      color: input.color,
      creditLimit: hasCredit ? input.creditLimit : null,
      closingDay: hasCredit ? input.closingDay : null,
      dueDay: hasCredit ? input.dueDay : null,
    }
  }

  /* ------------------------------ Categorias ----------------------------- */

  async createCategory(input: CategoryInput): Promise<Category> {
    await this.write()
    const ownerId = this.requireUser()
    const name = input.name.trim()
    const fields: Record<string, string> = {}
    if (name.length < 1 || name.length > 60) fields.name = 'Informe um nome de 1 a 60 caracteres.'
    // Sem conta a categoria vale em todas as contas do usuário.
    if (input.accountId && !findAccount(this.state, input.accountId)) {
      fields.accountId = 'Selecione uma conta válida.'
    }
    if (!fields.name && this.hasCategoryName(name, input.accountId, null)) {
      fields.name = 'Já existe uma categoria disponível com este nome.'
    }
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    const category: Category = {
      id: this.nextId('cat'),
      name,
      origin: 'personalizada',
      ownerId,
      accountId: input.accountId ?? null,
      archived: false,
    }
    this.state = { ...this.state, categories: [...this.state.categories, category] }
    this.persist()
    return category
  }

  async renameCategory(id: Id, name: string, accountId?: Id | null): Promise<Category> {
    await this.write()
    this.requireUser()
    const category = findCategory(this.state, id)
    if (!category || category.origin === 'padrao') {
      throw new DataError('Categorias padrão não podem ser alteradas.')
    }
    const trimmed = name.trim()
    const nextAccountId = accountId === undefined ? category.accountId : accountId
    const fields: Record<string, string> = {}
    if (trimmed.length < 1 || trimmed.length > 60) fields.name = 'Informe um nome de 1 a 60 caracteres.'
    else if (this.hasCategoryName(trimmed, nextAccountId, id)) {
      fields.name = 'Já existe uma categoria disponível com este nome.'
    }
    if (nextAccountId && !findAccount(this.state, nextAccountId)) {
      fields.accountId = 'Selecione uma conta válida.'
    }
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    const updated = { ...category, name: trimmed, accountId: nextAccountId }
    this.state = {
      ...this.state,
      categories: this.state.categories.map((item) => (item.id === id ? updated : item)),
    }
    this.persist()
    return updated
  }

  async archiveCategory(id: Id): Promise<void> {
    await this.write()
    this.requireUser()
    const category = findCategory(this.state, id)
    if (!category || category.origin === 'padrao') {
      throw new DataError('Categorias padrão não podem ser arquivadas.')
    }
    this.state = {
      ...this.state,
      categories: this.state.categories.map((item) =>
        item.id === id ? { ...item, archived: true } : item,
      ),
    }
    this.persist()
  }

  /** Conflita com o que já pode ser escolhido no mesmo gasto. */
  private hasCategoryName(name: string, accountId: Id | null, ignoreId: Id | null): boolean {
    const normalized = normalizeCategoryName(name)
    const candidates = accountId
      ? selectableCategories(this.state, accountId)
      : this.state.categories.filter((category) => !category.archived)
    return candidates.some(
      (category) => category.id !== ignoreId && normalizeCategoryName(category.name) === normalized,
    )
  }

  /* -------------------------- Pagamento de fatura ------------------------ */

  async registerInvoicePayment(input: InvoicePaymentInput): Promise<void> {
    await this.write()
    const ownerId = this.requireUser()
    const invoice = findInvoice(this.state, input.invoiceId)
    if (!invoice) throw new DataError('Fatura não encontrada.')

    const totals = invoiceTotals(this.state, invoice, this.today)
    const fields: Record<string, string> = {}
    if (!input.accountId || !findAccount(this.state, input.accountId)) {
      fields.accountId = 'Selecione a conta de origem.'
    }
    if (!isValidCivilDate(input.date)) fields.date = 'Informe uma data válida.'
    if (totals.remaining <= 0) throw new DataError('Esta fatura já está paga.')
    // Sem valor informado, o registro quita o restante; a antecipação de uma
    // fatura ainda aberta é permitida.
    const amount = input.amount ?? totals.remaining
    if (amount <= 0) fields.amount = 'Informe um valor maior que zero.'
    if (amount > totals.remaining) fields.amount = 'O valor excede o restante da fatura.'
    if (Object.keys(fields).length > 0) throw new ValidationError(fields)

    this.state = {
      ...this.state,
      invoicePayments: [
        ...this.state.invoicePayments,
        {
          id: this.nextId('pay'),
          ownerId,
          invoiceId: invoice.id,
          accountId: input.accountId as Id,
          amount,
          date: input.date,
        },
      ],
    }
    this.persist()
  }

  /* ----------------------------- Infraestrutura -------------------------- */

  private scopedState(): FinanceState {
    const ownerId = this.currentUserId
    if (!ownerId) return emptyState()
    const accounts = this.state.accounts.filter((account) => account.ownerId === ownerId)
    const accountIds = accounts.map((account) => account.id)
    const cards = this.state.cards.filter((card) => card.ownerId === ownerId)
    const cardIds = cards.map((card) => card.id)
    const invoices = this.state.invoices.filter((invoice) => cardIds.includes(invoice.cardId))
    const invoiceIds = invoices.map((invoice) => invoice.id)

    return {
      users: this.state.users.filter((user) => user.id === ownerId),
      accounts,
      cards,
      categories: [
        ...defaultCategories(),
        ...this.state.categories.filter(
          (category) => category.origin === 'personalizada' && category.ownerId === ownerId,
        ),
      ],
      incomes: this.state.incomes.filter((income) => accountIds.includes(income.accountId)),
      expenses: this.state.expenses.filter((expense) => accountIds.includes(expense.accountId)),
      invoices,
      invoicePayments: this.state.invoicePayments.filter((payment) =>
        invoiceIds.includes(payment.invoiceId),
      ),
    }
  }

  private persist(): void {
    writeStored(STORAGE_KEY, this.state)
  }

  private nextId(prefix: string): Id {
    this.sequence += 1
    return `${prefix}-${this.sequence}-${this.state.users.length + this.state.expenses.length}`
  }

  async read(): Promise<void> {
    await this.wait(READ_LATENCY)
    if (this.failing) throw new DataError('Não foi possível carregar os dados.')
  }

  private async write(): Promise<void> {
    await this.wait(WRITE_LATENCY)
    if (this.failing) throw new DataError('Não foi possível salvar. Tente novamente.')
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }
}

function isDayOfMonth(value: number | null): boolean {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 31
}

function readStored<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Armazenamento indisponível: o estado segue apenas em memória.
  }
}

function clearStored(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Ignorado pelo mesmo motivo acima.
  }
}
