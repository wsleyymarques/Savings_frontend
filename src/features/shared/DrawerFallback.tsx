import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { messageFor } from '../../services'

interface DrawerRecordProps<T> {
  title: string
  query: UseQueryResult<T>
  onClose: () => void
  children: (data: T) => ReactNode
}

/**
 * Carrega o registro antes de montar o formulário, para que a edição já abra
 * com os valores existentes em vez de preencher campos depois do foco.
 */
export function DrawerRecord<T>({ title, query, onClose, children }: DrawerRecordProps<T>) {
  if (query.isPending) {
    return (
      <FormDrawer
        title={title}
        submitLabel="Salvar"
        dirty={false}
        submitting={false}
        submitDisabled
        onSubmit={() => undefined}
        onClose={onClose}
      >
        <LoadingState label="Carregando registro…" rows={3} />
      </FormDrawer>
    )
  }

  if (query.isError) {
    return (
      <FormDrawer
        title={title}
        submitLabel="Salvar"
        dirty={false}
        submitting={false}
        submitDisabled
        onSubmit={() => undefined}
        onClose={onClose}
      >
        <ErrorState description={messageFor(query.error)} onRetry={() => void query.refetch()} />
      </FormDrawer>
    )
  }

  return <>{children(query.data as T)}</>
}
