import { useEffect } from 'react'
import { useDrawer } from './contexts'
import { OverviewPage } from '../features/overview/OverviewPage'

/**
 * `/perfil` é o endereço do drawer sobre a aplicação. No acesso direto, a
 * Visão geral fica ao fundo (design.md, seção 4.3).
 */
export function ProfileRoute() {
  const { open } = useDrawer()

  useEffect(() => {
    open({ kind: 'perfil' })
  }, [open])

  return <OverviewPage />
}
