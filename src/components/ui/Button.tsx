import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: IconName
  loading?: boolean
  loadingLabel?: string
  block?: boolean
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    icon,
    loading = false,
    loadingLabel = 'Salvando…',
    block = false,
    children,
    className,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={['btn', `btn--${variant}`, block ? 'btn--block' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      {!loading && icon ? <Icon name={icon} size={18} /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  )
})
