interface Option<T extends string> {
  value: T
  label: string
  hint?: string
}

interface RadioGroupProps<T extends string> {
  legend: string
  name: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  inline?: boolean
  error?: string
}

export function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  inline = false,
  error,
}: RadioGroupProps<T>) {
  return (
    <fieldset className="field">
      <legend className="field__label">{legend}</legend>
      <div className={['radio-group', inline ? 'radio-group--inline' : ''].filter(Boolean).join(' ')}>
        {options.map((option) => (
          <label
            key={option.value}
            className={['radio-option', option.value === value ? 'radio-option--checked' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>
              {option.label}
              {option.hint ? <span className="field__optional"> · {option.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="field__error">{error}</p> : null}
    </fieldset>
  )
}
