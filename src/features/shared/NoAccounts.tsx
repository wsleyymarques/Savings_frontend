import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { useDrawer } from '../../app/contexts'

export function NoAccounts({ description }: { description?: string }) {
  const drawer = useDrawer()
  return (
    <EmptyState
      icon="contas"
      title="Cadastre sua primeira conta"
      description={
        description ??
        'A conta financeira é onde o dinheiro é acompanhado. Depois dela você pode registrar receitas, gastos e cartões.'
      }
      action={
        <Button variant="primary" icon="plus" onClick={() => drawer.open({ kind: 'conta' })}>
          Nova conta
        </Button>
      }
    />
  )
}
