import { createContext, useContext } from 'react'

export interface ToastApi {
  notify: (message: string) => void
  notifyError: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider.')
  return context
}
