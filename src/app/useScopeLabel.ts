import { useAccountsQuery } from '../services/queries'
import { useScope, useSession } from './contexts'

/**
 * Nome do escopo ativo e situação das contas do usuário.
 * Reaproveita a consulta consolidada de contas já usada pela sidebar.
 */
export function useAccountScope(enabled = true) {
  const { accountId } = useScope()
  const { status } = useSession()
  const accounts = useAccountsQuery({ accountId: null }, enabled && status === 'authenticated')

  const selected = accounts.data?.find((account) => account.id === accountId)

  return {
    accountId,
    accounts: accounts.data ?? [],
    accountsQuery: accounts,
    scopeLabel: selected?.name ?? 'Todas as contas',
    hasAccounts: (accounts.data?.length ?? 0) > 0,
    accountsLoaded: accounts.isSuccess,
  }
}
