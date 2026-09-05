import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { InlineAlert } from '../ui/States'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface FormDrawerProps {
  title: string
  submitLabel: string
  submittingLabel?: string
  /** Há alterações não salvas: dispara a confirmação de descarte. */
  dirty: boolean
  submitting: boolean
  error?: string | null
  onSubmit: () => void
  onClose: () => void
  /** Etapa interna (criar categoria dentro do gasto). */
  onBack?: () => void
  children: ReactNode
  footerNote?: ReactNode
  submitDisabled?: boolean
}

export function FormDrawer({
  title,
  submitLabel,
  submittingLabel = 'Salvando…',
  dirty,
  submitting,
  error,
  onSubmit,
  onClose,
  onBack,
  children,
  footerNote,
  submitDisabled = false,
}: FormDrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  // Congela a rolagem da página compensando a barra, sem salto horizontal.
  useEffect(() => {
    const { body } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [])

  // Foco inicial no primeiro campo útil do painel.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const target =
      panel.querySelector<HTMLElement>('.drawer__body input, .drawer__body select, .drawer__body textarea') ??
      panel.querySelector<HTMLElement>('.drawer__body ' + FOCUSABLE) ??
      panel
    target.focus()
  }, [])

  function requestClose() {
    if (submitting) return
    if (dirty) {
      setConfirmingDiscard(true)
      return
    }
    onClose()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      requestClose()
      return
    }
    if (event.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null || element === document.activeElement,
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <div className="drawer-overlay" onMouseDown={requestClose} />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="drawer__header">
          {onBack ? <IconButton icon="arrow-left" label="Voltar" onClick={onBack} /> : null}
          <h2 className="drawer__title" id={titleId}>
            {title}
          </h2>
          <IconButton icon="close" label="Fechar painel" onClick={requestClose} disabled={submitting} />
        </header>

        <form
          className="drawer__body"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (!submitting) onSubmit()
          }}
          id={`${titleId}-form`}
        >
          {error ? (
            <InlineAlert tone="danger" title="Não foi possível salvar">
              {error}
            </InlineAlert>
          ) : null}
          {children}
        </form>

        {confirmingDiscard ? (
          <div className="drawer__discard" role="alertdialog" aria-label="Descartar alterações?">
            <p>
              <strong>Descartar alterações?</strong> As informações preenchidas neste painel serão perdidas.
            </p>
            <div className="drawer__discard-actions">
              <Button variant="secondary" onClick={() => setConfirmingDiscard(false)} autoFocus>
                Continuar editando
              </Button>
              <Button variant="danger" onClick={onClose}>
                Descartar
              </Button>
            </div>
          </div>
        ) : (
          <footer className="drawer__footer">
            {footerNote ? <div className="spacer text-muted caption">{footerNote}</div> : null}
            <Button variant="secondary" onClick={requestClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form={`${titleId}-form`}
              loading={submitting}
              loadingLabel={submittingLabel}
              disabled={submitDisabled}
            >
              {submitLabel}
            </Button>
          </footer>
        )}
      </div>
    </>
  )
}
