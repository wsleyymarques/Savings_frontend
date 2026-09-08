import type { SVGProps } from 'react'

/**
 * Família única de ícones de contorno (design.md, seção 4.2).
 * Nunca renderizar o nome do ícone como texto nem misturar emojis.
 */
export type IconName =
  | 'visao-geral'
  | 'lancamentos'
  | 'contas'
  | 'cartoes'
  | 'faturas'
  | 'categorias'
  | 'planejamento'
  | 'chevron-down'
  | 'chevron-updown'
  | 'chevron-right'
  | 'check'
  | 'close'
  | 'plus'
  | 'edit'
  | 'more'
  | 'search'
  | 'arrow-left'
  | 'user'
  | 'logout'
  | 'swap'
  | 'eye'
  | 'eye-off'
  | 'alert'
  | 'info'
  | 'inbox'
  | 'wallet'
  | 'calendar'
  | 'menu'
  | 'filter'
  | 'retry'
  | 'trending'

const PATHS: Record<IconName, JSX.Element> = {
  'visao-geral': (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  lancamentos: (
    <>
      <path d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  contas: (
    <>
      <path d="M3 10 12 4l9 6" />
      <path d="M5 10v8M10 10v8M14 10v8M19 10v8" />
      <path d="M3 20h18" />
    </>
  ),
  cartoes: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6.5 15h3" />
    </>
  ),
  faturas: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9.5 8.5h5M9.5 12.5h5" />
    </>
  ),
  categorias: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <circle cx="17.25" cy="6.75" r="3.75" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <path d="m17.25 13.5 3.75 7.5h-7.5Z" />
    </>
  ),
  planejamento: (
    <>
      <path d="M12 3a6 6 0 0 0-3.7 10.7c.8.7 1.2 1.5 1.2 2.3h5c0-.8.4-1.6 1.2-2.3A6 6 0 0 0 12 3Z" />
      <path d="M9.5 19h5M10.5 22h3" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-updown': <path d="m8 10 4-4 4 4M8 14l4 4 4-4" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  'arrow-left': <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 4.1" />
      <path d="M6.6 7.9A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.3" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13h4l1.5 3h6l1.5-3h4" />
      <path d="M5.5 5h13l2 8v4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-4Z" />
    </>
  ),
  wallet: (
    <>
      <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5H18v3" />
      <rect x="3.5" y="7.5" width="17" height="11.5" rx="2" />
      <circle cx="16.5" cy="13.2" r="1.1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8Z" />,
  retry: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4h-4" />
    </>
  ),
  trending: (
    <>
      <path d="m4 16 5-5 3.5 3.5L20 7" />
      <path d="M15 7h5v5" />
    </>
  ),
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /** Sem título o ícone é decorativo e fica oculto para leitores de tela. */
  title?: string
}

export function Icon({ name, size = 20, title, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  )
}
