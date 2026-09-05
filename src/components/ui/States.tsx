import type { ReactNode } from 'react'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="state-block">
      <span className="state-block__icon">
        <Icon name={icon} size={24} />
      </span>
      <p className="state-block__title">{title}</p>
      {description ? <p className="state-block__text">{description}</p> : null}
      {action}
    </div>
  )
}

interface LoadingStateProps {
  label?: string
  /** Número de linhas do esqueleto, aproximando a estrutura real. */
  rows?: number
}

export function LoadingState({ label = 'Carregando dados…', rows = 3 }: LoadingStateProps) {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <span className="visually-hidden">{label}</span>
      <div className="skeleton" style={{ height: 20, width: '40%' }} />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton" style={{ height: 56 }} />
      ))}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Não foi possível carregar este bloco',
  description = 'Os valores não estão disponíveis agora. Nenhum saldo foi zerado.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state-block" role="alert">
      <span className="state-block__icon" style={{ color: 'var(--color-danger)' }}>
        <Icon name="alert" size={24} />
      </span>
      <p className="state-block__title">{title}</p>
      <p className="state-block__text">{description}</p>
      {onRetry ? (
        <Button variant="secondary" icon="retry" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}

interface InlineAlertProps {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  children: ReactNode
}

export function InlineAlert({ tone = 'info', title, children }: InlineAlertProps) {
  const icon: IconName = tone === 'danger' || tone === 'warning' ? 'alert' : 'info'
  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={icon} size={18} />
      <div className="alert__content">
        {title ? <p className="alert__title">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}
