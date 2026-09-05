import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'

interface TriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref: React.Ref<HTMLButtonElement>
}

interface DropdownMenuProps {
  /** Nome acessível do menu aberto. */
  label: string
  trigger: (props: TriggerProps & { open: boolean }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  placement?: 'bottom' | 'top'
}

export function DropdownMenu({
  label,
  trigger,
  children,
  align = 'start',
  placement = 'bottom',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback(
    (restoreFocus = true) => {
      setOpen(false)
      if (restoreFocus) triggerRef.current?.focus()
    },
    [],
  )

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"],[role="menuitemradio"]')
    first?.focus()
  }, [open])

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"],[role="menuitemradio"]') ?? [],
    ).filter((item) => !item.hasAttribute('disabled'))
    if (items.length === 0) return
    event.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLElement)
    const next =
      event.key === 'ArrowDown'
        ? (current + 1) % items.length
        : (current - 1 + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <div style={{ position: 'relative' }}>
      {trigger({
        ref: triggerRef,
        open,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: () => setOpen((value) => !value),
      })}
      {open ? (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="menu"
          onKeyDown={handleMenuKeyDown}
          style={{
            [align === 'end' ? 'right' : 'left']: 0,
            [placement === 'top' ? 'bottom' : 'top']: 'calc(100% + 4px)',
          }}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  )
}

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  detail?: ReactNode
  children: ReactNode
}

export function MenuItem({ checked, detail, children, ...props }: MenuItemProps) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      className="menu__item"
      {...props}
    >
      <span>{children}</span>
      {detail ? <span className="menu__item-detail">{detail}</span> : null}
    </button>
  )
}

export function MenuSeparator() {
  return <div className="menu__separator" role="separator" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="menu__label">{children}</p>
}
