import type {
  OverviewParams,
  ScopeParams,
  TransactionListParams,
} from './contracts'
import type { Id } from '../data/types'

/**
 * Chaves estáveis por domínio e pelos parâmetros de escopo/filtro.
 * Toda invalidação usa os prefixos `all` de cada domínio.
 */
export const queryKeys = {
  session: ['sessao'] as const,

  overview: {
    all: ['visao-geral'] as const,
    byParams: (params: OverviewParams) =>
      [
        'visao-geral',
        params.accountId ?? 'todas',
        params.start,
        params.end,
        params.categoryId ?? 'todas-categorias',
        params.method ?? 'todas-formas',
        params.expenseMode ?? 'todos-tipos-despesa',
      ] as const,
  },

  accounts: {
    all: ['contas'] as const,
    list: (params: ScopeParams) => ['contas', 'lista', params.accountId ?? 'todas'] as const,
    detail: (id: Id) => ['contas', 'detalhe', id] as const,
  },

  transactions: {
    all: ['lancamentos'] as const,
    list: (params: TransactionListParams) =>
      [
        'lancamentos',
        'lista',
        params.accountId ?? 'todas',
        params.start,
        params.end,
        params.kind ?? 'todos',
        params.search ?? '',
        params.categoryId ?? 'todas-categorias',
        params.method ?? 'todas-formas',
        params.expenseMode ?? 'todos-tipos-despesa',
      ] as const,
    count: (params: ScopeParams) => ['lancamentos', 'contagem', params.accountId ?? 'todas'] as const,
    income: (id: Id) => ['lancamentos', 'receita', id] as const,
    expense: (id: Id) => ['lancamentos', 'despesa', id] as const,
  },

  cards: {
    all: ['cartoes'] as const,
    list: (params: ScopeParams) => ['cartoes', 'lista', params.accountId ?? 'todas'] as const,
    detail: (id: Id) => ['cartoes', 'detalhe', id] as const,
  },

  invoices: {
    all: ['faturas'] as const,
    list: (params: ScopeParams & { cardId?: Id | null; cycleMonth?: string | null }) =>
      [
        'faturas',
        'lista',
        params.accountId ?? 'todas',
        params.cardId ?? 'todos-cartoes',
        params.cycleMonth ?? 'todos-ciclos',
      ] as const,
    detail: (id: Id) => ['faturas', 'detalhe', id] as const,
  },

  categories: {
    all: ['categorias'] as const,
    list: (params: ScopeParams) => ['categorias', 'lista', params.accountId ?? 'todas'] as const,
    selectable: (params: ScopeParams) =>
      ['categorias', 'selecionaveis', params.accountId ?? 'nenhuma'] as const,
  },
} as const
