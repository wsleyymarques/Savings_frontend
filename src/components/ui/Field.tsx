import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { formatAmountInput, parseMoney, type Cents } from '../../lib/money'
import { IconButton } from './IconButton'

interface FieldShellProps {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: (ids: { controlId: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/** Rótulo visível, ajuda/erro associados e estado inválido semântico. */
export function Field({ label, hint, error, optional = false, children }: FieldShellProps) {
  const controlId = useId()
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={controlId}>
        {label}
        {optional ? <span className="field__optional"> (opcional)</span> : null}
      </label>
      {children({ controlId, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  error?: string
  optional?: boolean
}

export function TextField({ label, hint, error, optional, ...props }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {({ controlId, describedBy, invalid }) => (
        <input
          {...props}
          id={controlId}
          className={['input', invalid ? 'input--invalid' : '', props.className ?? '']
            .filter(Boolean)
            .join(' ')}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
        />
      )}
    </Field>
  )
}

interface PasswordFieldProps extends TextFieldProps {
  visible: boolean
  onToggleVisible: () => void
}

export function PasswordField({
  label,
  hint,
  error,
  visible,
  onToggleVisible,
  ...props
}: PasswordFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ controlId, describedBy, invalid }) => (
        <div className={['input-affix', invalid ? 'input-affix--invalid' : ''].filter(Boolean).join(' ')}>
          <input
            {...props}
            id={controlId}
            type={visible ? 'text' : 'password'}
            className="input"
            style={{ paddingLeft: 'var(--space-3)' }}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
          <IconButton
            icon={visible ? 'eye-off' : 'eye'}
            label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={onToggleVisible}
          />
        </div>
      )}
    </Field>
  )
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  hint?: string
  error?: string
  placeholder?: string
  children: ReactNode
}

export function SelectField({
  label,
  hint,
  error,
  placeholder,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ controlId, describedBy, invalid }) => (
        <select
          {...props}
          id={controlId}
          className={['select', invalid ? 'select--invalid' : ''].filter(Boolean).join(' ')}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {children}
        </select>
      )}
    </Field>
  )
}

interface MoneyFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
}

/** Prefixo R$, entrada decimal brasileira e normalização apenas ao sair do campo. */
export function MoneyField({
  label,
  value,
  onChange,
  hint,
  error,
  disabled,
  readOnly,
  autoFocus,
}: MoneyFieldProps) {
  function handleBlur() {
    const parsed = parseMoney(value)
    if (parsed.ok) onChange(formatAmountInput(parsed.cents))
  }

  return (
    <Field label={label} hint={hint} error={error}>
      {({ controlId, describedBy, invalid }) => (
        <div
          className={['input-affix', invalid ? 'input-affix--invalid' : ''].filter(Boolean).join(' ')}
        >
          <span className="input-affix__prefix" aria-hidden="true">
            R$
          </span>
          <input
            id={controlId}
            className="input money-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            onChange={(event) => onChange(event.target.value)}
            onBlur={handleBlur}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        </div>
      )}
    </Field>
  )
}

interface DateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string
  disabled?: boolean
  readOnly?: boolean
}

/**
 * `input[type=date]` mantém a data civil AAAA-MM-DD sem conversão de fuso e
 * já oferece o calendário nativo acessível. Escolha simples registrada.
 */
export function DateField({ label, value, onChange, hint, error, disabled, readOnly }: DateFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ controlId, describedBy, invalid }) => (
        <input
          id={controlId}
          type="date"
          className={['input', invalid ? 'input--invalid' : ''].filter(Boolean).join(' ')}
          value={value}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
        />
      )}
    </Field>
  )
}

export type { Cents }
