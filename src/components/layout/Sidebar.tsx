import { NavLink } from 'react-router-dom'
import { formatMoney } from '../../lib/money'
import { useDrawer, useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useTransactionsCountQuery } from '../../services/queries'
import { sum } from '../../lib/money'
import { initialsOf } from '../../lib/initials'
import { Icon, type IconName } from '../ui/Icon'
import { DropdownMenu, MenuItem, MenuLabel, MenuSeparator } from '../ui/DropdownMenu'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

/** Uma seção por aplicação do hub; a casca e a sessão são compartilhadas. */
const NAV_SECTIONS: { app: string; items: NavItem[] }[] = [
  {
    app: 'Finanças',
    items: [
      { to: '/visao-geral', label: 'Visão geral', icon: 'visao-geral' },
      { to: '/lancamentos', label: 'Lançamentos', icon: 'lancamentos' },
      { to: '/planejamento', label: 'Planejamento', icon: 'planejamento' },
      { to: '/contas', label: 'Contas', icon: 'contas' },
      { to: '/cartoes', label: 'Cartões', icon: 'cartoes' },
      { to: '/faturas', label: 'Faturas', icon: 'faturas' },
      { to: '/categorias', label: 'Categorias', icon: 'categorias' },
    ],
  },
  {
    app: 'Metas',
    items: [{ to: '/metas', label: 'Ciclos e objetivos', icon: 'trending' }],
  },
]

interface SidebarProps {
  open: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onNavigate: () => void
}

export function Sidebar({ open, collapsed, onToggleCollapsed, onNavigate }: SidebarProps) {
  const { accountId, setAccountId } = useScope()
  const { accounts, accountsQuery, scopeLabel } = useAccountScope()
  const { user, signOut, status } = useSession()
  const drawer = useDrawer()

  const consolidated = sum(accounts.map((account) => account.currentBalance))
  const selected = accounts.find((account) => account.id === accountId)
  const scopeBalance = selected ? selected.currentBalance : consolidated

  // Contagem real da listagem sob o escopo atual; oculta enquanto não estiver disponível.
  const count = useTransactionsCountQuery({ accountId }, status === 'authenticated')

  return (
    <nav
      className={['sidebar', open ? 'sidebar--open' : '', collapsed ? 'sidebar--collapsed' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Navegação principal"
      id="navegacao-principal"
    >
      <div className="sidebar__header">
        <NavLink className="sidebar__brand" to="/visao-geral" onClick={onNavigate}>
          <span className="sidebar__mark" aria-hidden="true" />
          <span className="sidebar__brand-text">Minhas Finanças</span>
        </NavLink>
        <button
          type="button"
          className="sidebar__collapse"
          onClick={onToggleCollapsed}
          aria-pressed={collapsed}
          title={collapsed ? 'Expandir navegação' : 'Minimizar navegação'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'arrow-left'} size={18} />
          <span className="visually-hidden">
            {collapsed ? 'Expandir navegação' : 'Minimizar navegação'}
          </span>
        </button>
      </div>

      <div className="sidebar__scope">
        <DropdownMenu
          label="Escolher conta financeira"
          trigger={({ ref, ...props }) => (
            <button ref={ref} type="button" className="scope" title={scopeLabel} {...props}>
              <span className="scope__initials" aria-hidden="true">
                {initialsOf(selected?.name ?? 'Todas as contas')}
              </span>
              <span className="scope__top">
                <span className="scope__eyebrow">CONTA ATIVA</span>
                {accountsQuery.isSuccess ? (
                  <span className="scope__balance">{formatMoney(scopeBalance)}</span>
                ) : null}
              </span>
              <span className="scope__bottom">
                <span className="scope__name">
                  {accountsQuery.isSuccess && accounts.length === 0 ? 'Nenhuma conta' : scopeLabel}
                </span>
                <Icon name="chevron-updown" size={18} className="scope__chevron" />
              </span>
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Escopo dos dados financeiros</MenuLabel>
              {accounts.length === 0 ? (
                <MenuItem
                  onClick={() => {
                    close()
                    drawer.open({ kind: 'conta' })
                  }}
                >
                  Criar conta
                </MenuItem>
              ) : (
                <>
                  <MenuItem
                    checked={accountId === null}
                    detail={formatMoney(consolidated)}
                    onClick={() => {
                      setAccountId(null)
                      close()
                    }}
                  >
                    Todas as contas
                  </MenuItem>
                  <MenuSeparator />
                  {accounts.map((account) => (
                    <MenuItem
                      key={account.id}
                      checked={accountId === account.id}
                      detail={formatMoney(account.currentBalance)}
                      onClick={() => {
                        setAccountId(account.id)
                        close()
                      }}
                    >
                      {account.name}
                    </MenuItem>
                  ))}
                </>
              )}
            </>
          )}
        </DropdownMenu>
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.app} className="sidebar__section">
          <p className="sidebar__section-label">{section.app}</p>
          <ul className="sidebar__nav">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  title={item.label}
                  className={({ isActive }) =>
                    ['nav-item', isActive ? 'nav-item--active' : ''].filter(Boolean).join(' ')
                  }
                >
                  <Icon name={item.icon} />
                  <span className="nav-item__label">{item.label}</span>
                  {item.to === '/lancamentos' && count.isSuccess && count.data > 0 ? (
                    <span className="nav-item__badge">{count.data}</span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="sidebar__spacer" />

      <div className="sidebar__user">
        <DropdownMenu
          label="Menu do usuário"
          placement="top"
          trigger={({ ref, ...props }) => (
            <button ref={ref} type="button" className="user-button" {...props}>
              <span className="user-avatar" aria-hidden="true">
                {initialsOf(user?.name ?? '')}
              </span>
              <span className="user-button__text">
                <span className="user-button__name" title={user?.name}>
                  {user?.name ?? 'Usuário'}
                </span>
                <span className="user-button__email" title={user?.email}>
                  {user?.email ?? ''}
                </span>
              </span>
              <Icon name="chevron-updown" size={18} />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                onClick={() => {
                  close()
                  drawer.open({ kind: 'perfil' })
                }}
              >
                Meu perfil
              </MenuItem>
              <MenuItem onClick={() => void signOut('trocar')}>Trocar usuário</MenuItem>
              <MenuSeparator />
              <MenuItem onClick={() => void signOut('sair')}>Sair</MenuItem>
            </>
          )}
        </DropdownMenu>
      </div>
    </nav>
  )
}
