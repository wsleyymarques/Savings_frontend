import type { Category, FinanceState } from './types'

/**
 * Relógio da fixture. O SDD pede a posição em 10/10/2026 (design.md, seção 8)
 * e a camada de dados precisa ser determinística enquanto não há backend.
 * Trocar por `new Date()` é uma alteração de uma linha quando a persistência existir.
 */
export const FIXTURE_TODAY = '2026-10-10'

export const DEFAULT_CATEGORY_NAMES = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Serviços e assinaturas',
  'Impostos e taxas',
  'Outros',
] as const

export const CARD_COLORS = [
  { value: '#047857', label: 'Verde esmeralda' },
  { value: '#1d4ed8', label: 'Azul' },
  { value: '#7c3aed', label: 'Roxo' },
  { value: '#b45309', label: 'Âmbar' },
  { value: '#be123c', label: 'Vermelho' },
  { value: '#0f172a', label: 'Grafite' },
] as const

export function defaultCategories(): Category[] {
  return DEFAULT_CATEGORY_NAMES.map((name, index) => ({
    id: `cat-padrao-${index + 1}`,
    name,
    origin: 'padrao' as const,
    ownerId: null,
    accountId: null,
    archived: false,
  }))
}

/** Estado vazio: usado por um cadastro novo, que cai no primeiro acesso. */
export function emptyState(): FinanceState {
  return {
    users: [],
    accounts: [],
    cards: [],
    categories: defaultCategories(),
    incomes: [],
    expenses: [],
    invoices: [],
    invoicePayments: [],
  }
}

/** Fixture de demonstração conforme design.md, seção 8. */
export function seedState(): FinanceState {
  const ownerId = 'user-alex'

  return {
    users: [{ id: ownerId, name: 'Alexandre Junqueira', email: 'alexandre@email.com' }],
    accounts: [
      {
        id: 'acc-principal',
        ownerId,
        name: 'Conta Principal',
        initialBalance: 100_000,
        referenceDate: '2026-09-01',
        createdAt: '2026-09-01',
      },
      {
        id: 'acc-secundaria',
        ownerId,
        name: 'Conta Secundária',
        initialBalance: 50_000,
        referenceDate: '2026-09-01',
        createdAt: '2026-09-01',
      },
    ],
    cards: [
      {
        id: 'card-principal',
        ownerId,
        accountId: 'acc-principal',
        name: 'Cartão Principal',
        functions: 'ambas',
        color: '#047857',
        creditLimit: 200_000,
        closingDay: 8,
        dueDay: 15,
      },
      {
        id: 'card-secundario',
        ownerId,
        accountId: 'acc-secundaria',
        name: 'Cartão Secundário',
        functions: 'credito',
        color: '#1d4ed8',
        creditLimit: 300_000,
        closingDay: 20,
        dueDay: 28,
      },
    ],
    categories: [
      ...defaultCategories(),
      {
        id: 'cat-equipamentos',
        name: 'Equipamentos',
        origin: 'personalizada',
        ownerId,
        accountId: 'acc-principal',
        archived: false,
      },
    ],
    incomes: [
      {
        id: 'inc-1',
        ownerId,
        description: 'Salário de setembro',
        amount: 300_000,
        accountId: 'acc-principal',
        date: '2026-09-05',
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        ownerId,
        description: 'Mercado do mês',
        amount: 10_000,
        date: '2026-09-08',
        method: 'pix',
        accountId: 'acc-principal',
        cardId: null,
        categoryId: 'cat-padrao-1',
        invoiceId: null,
      },
      {
        id: 'exp-2',
        ownerId,
        description: 'Combustível',
        amount: 15_000,
        date: '2026-09-12',
        method: 'debito',
        accountId: 'acc-principal',
        cardId: 'card-principal',
        categoryId: 'cat-padrao-3',
        invoiceId: null,
      },
      {
        id: 'exp-3',
        ownerId,
        description: 'Monitor 27 polegadas',
        amount: 30_000,
        date: '2026-09-20',
        method: 'credito',
        accountId: 'acc-principal',
        cardId: 'card-principal',
        categoryId: 'cat-equipamentos',
        invoiceId: 'inv-principal-out',
      },
      {
        id: 'exp-4',
        ownerId,
        description: 'Conta de luz',
        amount: 20_000,
        date: '2026-09-10',
        method: 'boleto',
        accountId: 'acc-secundaria',
        cardId: null,
        categoryId: 'cat-padrao-2',
        invoiceId: null,
      },
      {
        id: 'exp-5',
        ownerId,
        description: 'Cadeira de escritório',
        amount: 40_000,
        date: '2026-09-24',
        method: 'credito',
        accountId: 'acc-secundaria',
        cardId: 'card-secundario',
        categoryId: 'cat-padrao-7',
        invoiceId: 'inv-secundario-out',
      },
    ],
    invoices: [
      {
        id: 'inv-principal-out',
        ownerId,
        cardId: 'card-principal',
        cycleLabel: 'Outubro de 2026',
        periodStart: '2026-09-09',
        periodEnd: '2026-10-08',
        closingDate: '2026-10-08',
        dueDate: '2026-10-15',
      },
      {
        id: 'inv-secundario-out',
        ownerId,
        cardId: 'card-secundario',
        cycleLabel: 'Outubro de 2026',
        periodStart: '2026-09-21',
        periodEnd: '2026-10-20',
        closingDate: '2026-10-20',
        dueDate: '2026-10-28',
      },
    ],
    invoicePayments: [],
  }
}
