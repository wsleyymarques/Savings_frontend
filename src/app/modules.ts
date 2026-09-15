import type { IconName } from '../components/ui/Icon'

export type HubModuleId = 'finance' | 'habits'

export interface HubModule {
  id: HubModuleId
  name: string
  home: string
  items: Array<{ to: string; label: string; icon: IconName }>
}

export const HUB_MODULES: Record<HubModuleId, HubModule> = {
  finance: {
    id: 'finance',
    name: 'Savings',
    home: '/visao-geral',
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
  habits: {
    id: 'habits',
    name: 'Habits',
    home: '/habits/hoje',
    items: [
      { to: '/habits/hoje', label: 'Hoje', icon: 'check' },
      { to: '/habits/rotina', label: 'Rotina', icon: 'calendar' },
      { to: '/habits/estatisticas', label: 'Estatísticas', icon: 'trending' },
      { to: '/habits/metas', label: 'Metas', icon: 'planejamento' },
    ],
  },
}

export function moduleForPath(pathname: string): HubModule {
  return pathname.startsWith('/habits') || pathname.startsWith('/metas')
    ? HUB_MODULES.habits
    : HUB_MODULES.finance
}

const LAST_ROUTE_PREFIX = 'wesley-hub:ultima-rota:'
const LAST_MODULE_KEY = 'wesley-hub:ultimo-modulo'

export function rememberModuleRoute(moduleId: HubModuleId, pathname: string): void {
  try {
    window.localStorage.setItem(`${LAST_ROUTE_PREFIX}${moduleId}`, pathname)
    window.localStorage.setItem(LAST_MODULE_KEY, moduleId)
  } catch {
    // A navegação continua funcional sem persistência local.
  }
}

export function lastHubRoute(): string {
  try {
    const id = window.localStorage.getItem(LAST_MODULE_KEY)
    if (id === 'finance' || id === 'habits') return routeForModule(HUB_MODULES[id])
  } catch {
    // Usa Savings como entrada segura quando não há preferência.
  }
  return HUB_MODULES.finance.home
}

export function routeForModule(module: HubModule): string {
  try {
    const saved = window.localStorage.getItem(`${LAST_ROUTE_PREFIX}${module.id}`)
    if (saved && moduleForPath(saved).id === module.id) return saved
  } catch {
    // Usa a rota inicial quando o armazenamento estiver indisponível.
  }
  return module.home
}
