import { DateField, SelectField } from '../../components/ui/Field'
import { PERIOD_PRESETS, type PeriodPreset } from '../../lib/period'
import type { CivilDate } from '../../lib/date'

interface PeriodFilterProps {
  preset: PeriodPreset
  onPresetChange: (preset: PeriodPreset) => void
  start: CivilDate
  end: CivilDate
  onCustomChange: (range: { start: CivilDate; end: CivilDate }) => void
}

export function PeriodFilter({
  preset,
  onPresetChange,
  start,
  end,
  onCustomChange,
}: PeriodFilterProps) {
  return (
    <>
      <SelectField
        label="Período"
        value={preset}
        onChange={(event) => onPresetChange(event.target.value as PeriodPreset)}
      >
        {PERIOD_PRESETS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      {preset === 'personalizado' ? (
        <>
          <DateField label="De" value={start} onChange={(value) => onCustomChange({ start: value, end })} />
          <DateField label="Até" value={end} onChange={(value) => onCustomChange({ start, end: value })} />
        </>
      ) : null}
    </>
  )
}
