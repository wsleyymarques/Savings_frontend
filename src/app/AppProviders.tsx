import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { services } from '../services'
import { queryKeys } from '../services/queryKeys'
import type { Id, User } from '../data/types'
import { ToastProvider } from '../components/ui/Toast'
import {
  DrawerContext,
  ScopeContext,
  SessionContext,
  type DrawerRequest,
  type SessionStatus,
} from './contexts'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ScopeProvider>
          <DrawerProvider>
            <ToastProvider>{children}</ToastProvider>
          </DrawerProvider>
        </ScopeProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}

function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const [switching, setSwitching] = useState(false)

  const session = useQuery({
    queryKey: queryKeys.session,
    queryFn: () => services.auth.restoreSession(),
    retry: false,
    staleTime: Infinity,
  })

  const status: SessionStatus = session.isPending
    ? 'checking'
    : session.data
      ? 'authenticated'
      : 'anonymous'

  const value = useMemo(
    () => ({
      user: session.data ?? null,
      status,
      switching,
      signIn: async (input: { email: string; password: string }) => {
        const user = await services.auth.signIn(input)
        startSession(client, user)
        setSwitching(false)
      },
      signUp: async (input: { name: string; email: string; password: string }) => {
        const user = await services.auth.signUp(input)
        startSession(client, user)
        setSwitching(false)
      },
      signOut: async (mode: 'sair' | 'trocar') => {
        await services.auth.signOut()
        // Cancela respostas pendentes e preserva a consulta observada de sessão
        // para que seus consumidores recebam o estado anônimo imediatamente.
        await client.cancelQueries()
        client.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.session[0] })
        client.setQueryData(queryKeys.session, null)
        setSwitching(mode === 'trocar')
      },
      updateProfile: async (name: string) => {
        const user = await services.auth.updateProfile({ name })
        client.setQueryData(queryKeys.session, user)
      },
      changePassword: (input: { currentPassword: string; newPassword: string }) =>
        services.auth.changePassword(input),
    }),
    [client, session.data, status, switching],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

function startSession(client: ReturnType<typeof useQueryClient>, user: User) {
  // Descarta o cache de um usuário anterior sem remover a própria sessão:
  // limpar tudo faria a consulta de sessão voltar a "carregando" logo após o login.
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.session[0] })
  client.setQueryData(queryKeys.session, user)
}

function ScopeProvider({ children }: { children: ReactNode }) {
  const [accountId, setAccountId] = useState<Id | null>(null)
  const value = useMemo(() => ({ accountId, setAccountId }), [accountId])
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

function DrawerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DrawerRequest | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const open = useCallback((next: DrawerRequest) => {
    triggerRef.current = document.activeElement as HTMLElement | null
    setRequest(next)
  }, [])

  const close = useCallback(() => {
    setRequest(null)
    const trigger = triggerRef.current
    triggerRef.current = null
    if (trigger && document.contains(trigger)) trigger.focus()
    else document.querySelector<HTMLElement>('main h1')?.focus()
  }, [])

  const value = useMemo(() => ({ request, open, close }), [request, open, close])
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
}
