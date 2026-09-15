import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { IconButton } from '../ui/IconButton'
import { DrawerHost } from './DrawerHost'
import { moduleForPath, rememberModuleRoute } from '../../app/modules'

const COLLAPSED_KEY = 'wesley-hub:navegacao-minimizada'

/** A preferência de sidebar minimizada acompanha o usuário entre as sessões. */
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
    rememberModuleRoute(moduleForPath(location.pathname).id, location.pathname)
  }, [location.pathname])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, String(collapsed))
    } catch {
      // Sem armazenamento disponível a preferência vale só para esta sessão.
    }
  }, [collapsed])

  return (
    <div className={['shell', collapsed ? 'shell--nav-collapsed' : ''].filter(Boolean).join(' ')}>
      <Sidebar
        open={navOpen}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onNavigate={() => setNavOpen(false)}
      />
      {navOpen ? <div className="nav-overlay" onClick={() => setNavOpen(false)} /> : null}

      <div className="shell__topbar">
        <IconButton
          icon="menu"
          label="Abrir navegação"
          aria-expanded={navOpen}
          aria-controls="navegacao-principal"
          onClick={() => setNavOpen(true)}
        />
        <span className="card-title">Wesley Hub · {moduleForPath(location.pathname).name}</span>
      </div>

      <main className="shell__main">
        <Outlet />
      </main>

      <DrawerHost />
    </div>
  )
}
