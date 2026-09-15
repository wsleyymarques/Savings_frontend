import { createContext, useContext } from 'react'
import type { Id, User } from '../data/types'
import type { CommitmentOccurrence, HabitDailyItem } from '../services/contracts'

/**
 * Context guarda apenas sessão, escopo de conta e estado de interface.
 * O cache de dados remotos pertence ao React Query.
 */

/* --------------------------------- Sessão ---------------------------------- */

export type SessionStatus = 'checking' | 'authenticated' | 'anonymous'

export interface SessionValue {
  user: User | null
  status: SessionStatus
  /** Título alternativo do login após "Trocar usuário". */
  switching: boolean
  signIn: (input: { email: string; password: string }) => Promise<void>
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>
  signOut: (mode: 'sair' | 'trocar') => Promise<void>
  updateProfile: (name: string) => Promise<void>
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession precisa estar dentro de AppProviders.')
  return value
}

/* --------------------------------- Escopo ---------------------------------- */

export interface ScopeValue {
  /** `null` representa o escopo consolidado "Todas as contas". */
  accountId: Id | null
  setAccountId: (accountId: Id | null) => void
}

export const ScopeContext = createContext<ScopeValue | null>(null)

export function useScope(): ScopeValue {
  const value = useContext(ScopeContext)
  if (!value) throw new Error('useScope precisa estar dentro de AppProviders.')
  return value
}

/* --------------------------------- Drawer ---------------------------------- */

export type DrawerRequest =
  | { kind: 'receita'; id?: Id }
  | { kind: 'gasto'; id?: Id; recurringRule?: boolean }
  | { kind: 'conta'; id?: Id }
  | { kind: 'cartao'; id?: Id }
  | { kind: 'categoria'; id?: Id; accountId?: Id }
  | { kind: 'pagamento'; invoiceId: Id }
  | { kind: 'perfil' }
  | { kind: 'desejo'; id?: Id }
  | { kind: 'gasto-planejado'; id?: Id; wishId?: Id }
  | { kind: 'realizar-gasto'; id: Id }
  | { kind: 'compromisso'; id?: Id }
  | { kind: 'pagar-compromisso'; id: Id; occurrence: CommitmentOccurrence }
  | { kind: 'ciclo-meta'; id?: Id }
  | { kind: 'objetivo-meta'; cycleId: Id; id?: Id }
  | { kind: 'progresso-meta'; objectiveId: Id }
  | { kind: 'habito'; id?: Id }
  | { kind: 'item-habito'; date: string; preferExisting?: boolean }
  | { kind: 'registro-habito'; item: HabitDailyItem }

export interface DrawerValue {
  request: DrawerRequest | null
  open: (request: DrawerRequest) => void
  close: () => void
}

export const DrawerContext = createContext<DrawerValue | null>(null)

export function useDrawer(): DrawerValue {
  const value = useContext(DrawerContext)
  if (!value) throw new Error('useDrawer precisa estar dentro de AppProviders.')
  return value
}
