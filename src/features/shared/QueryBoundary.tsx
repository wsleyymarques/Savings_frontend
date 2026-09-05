import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { messageFor } from '../../services'

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>
  rows?: number
  children: (data: T) => ReactNode
}

/**
 * Carregando, erro e nova tentativa vêm do React Query.
 * Uma falha nunca é apresentada como saldo zero.
 */
export function QueryBoundary<T>({ query, rows = 3, children }: QueryBoundaryProps<T>) {
  if (query.isPending) return <LoadingState rows={rows} />
  if (query.isError) {
    return <ErrorState description={messageFor(query.error)} onRetry={() => void query.refetch()} />
  }
  return <>{children(query.data as T)}</>
}
