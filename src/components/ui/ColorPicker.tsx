import { CARD_COLORS } from '../../data/seed'
import { Icon } from './Icon'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <fieldset className="field">
      <legend className="field__label">Cor de identificação</legend>
      <div className="color-picker">
        {CARD_COLORS.map((color) => (
          <label
            key={color.value}
            className={['color-swatch', color.value === value ? 'color-swatch--checked' : '']
              .filter(Boolean)
              .join(' ')}
            style={{ background: color.value }}
          >
            <input
              type="radio"
              name="card-color"
              value={color.value}
              checked={color.value === value}
              onChange={() => onChange(color.value)}
            />
            <span className="visually-hidden">{color.label}</span>
            {color.value === value ? <Icon name="check" size={18} /> : null}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
