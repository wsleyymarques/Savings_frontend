import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { IconButton } from './IconButton'
import { ToastContext, type ToastApi } from './toastContext'

interface ToastItem {
  id: number
  message: string
  tone: 'default' | 'danger'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: ToastItem['tone']) => {
    const id = Date.now() + Math.random()
    setItems((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    }, 5000)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      notify: (message) => push(message, 'default'),
      notifyError: (message) => push(message, 'danger'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={['toast', item.tone === 'danger' ? 'toast--danger' : ''].join(' ')}>
            <span>{item.message}</span>
            <IconButton
              icon="close"
              label="Fechar aviso"
              className="toast__close"
              onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
