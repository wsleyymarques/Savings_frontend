import { useCallback, useState } from 'react'
import { fieldsFor, messageFor } from '../../services'

/**
 * Estado comum dos formulários do drawer: rascunho, alterações não salvas,
 * erros por campo, erro geral e envio em andamento.
 */
export function useDrawerForm<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [dirty, setDirty] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const patch = useCallback((changes: Partial<T>) => {
    setValues((current) => ({ ...current, ...changes }))
    setDirty(true)
  }, [])

  /** Substitui o rascunho sem marcar alterações (voltar de uma etapa interna). */
  const replace = useCallback((next: T) => setValues(next), [])

  const submit = useCallback(async (action: () => Promise<unknown>) => {
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await action()
      return true
    } catch (error) {
      const fields = fieldsFor(error)
      setFieldErrors(fields)
      setFormError(Object.keys(fields).length > 0 ? null : messageFor(error))
      // Leva o foco ao primeiro campo inválido, preservando os demais valores.
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.drawer [aria-invalid="true"]')?.focus()
      })
      return false
    } finally {
      setSubmitting(false)
    }
  }, [])

  return {
    values,
    patch,
    replace,
    dirty,
    setDirty,
    fieldErrors,
    setFieldErrors,
    formError,
    setFormError,
    submitting,
    submit,
  }
}
