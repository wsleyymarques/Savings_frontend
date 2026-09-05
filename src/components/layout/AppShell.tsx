import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { IconButton } from '../ui/IconButton'
import { DrawerHost } from './DrawerHost'

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  return (
    <div className="shell">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen ? <div className="nav-overlay" onClick={() => setNavOpen(false)} /> : null}

      <div className="shell__topbar">
        <IconButton
          icon="menu"
          label="Abrir navegação"
          aria-expanded={navOpen}
          aria-controls="navegacao-principal"
          onClick={() => setNavOpen(true)}
        />
        <span className="card-title">Minhas Finanças</span>
      </div>

      <main className="shell__main">
        <Outlet />
      </main>

      <DrawerHost />
    </div>
  )
}
