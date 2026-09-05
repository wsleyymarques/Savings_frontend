import { Button } from '../../components/ui/Button'
import { DropdownMenu, MenuItem } from '../../components/ui/DropdownMenu'
import { useDrawer } from '../../app/contexts'

/** Ação principal unificada "Novo lançamento" (design.md, seção 8). */
export function NewEntryMenu({ disabled = false }: { disabled?: boolean }) {
  const drawer = useDrawer()
  return (
    <DropdownMenu
      label="Escolher tipo de lançamento"
      align="end"
      trigger={({ ref, ...props }) => (
        <Button ref={ref} variant="primary" icon="plus" disabled={disabled} {...props}>
          Novo lançamento
        </Button>
      )}
    >
      {(close) => (
        <>
          <MenuItem
            onClick={() => {
              close()
              drawer.open({ kind: 'receita' })
            }}
          >
            Nova receita
          </MenuItem>
          <MenuItem
            onClick={() => {
              close()
              drawer.open({ kind: 'gasto' })
            }}
          >
            Novo gasto
          </MenuItem>
        </>
      )}
    </DropdownMenu>
  )
}
