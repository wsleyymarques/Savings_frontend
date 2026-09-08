import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  /** Nome acessível obrigatório: o ícone nunca é a única identificação. */
  label: string
  outlined?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, outlined = false, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={['icon-btn', outlined ? 'icon-btn--outlined' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  )
})
