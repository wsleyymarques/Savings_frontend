import type { ReactNode } from 'react'

interface SurfaceCardProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  flush?: boolean
  children: ReactNode
  id?: string
}

export function SurfaceCard({
  title,
  description,
  actions,
  flush = false,
  children,
  id,
}: SurfaceCardProps) {
  return (
    <section className={['surface', flush ? 'surface--flush' : ''].filter(Boolean).join(' ')} id={id}>
      {title || actions ? (
        <header className="surface__header">
          <div>
            {title ? <h2 className="card-title">{title}</h2> : null}
            {description ? <p className="text-secondary">{description}</p> : null}
          </div>
          {actions ? <div className="row">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}
