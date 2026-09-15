import { useEffect, useRef } from 'react'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { SelectField, TextField } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toastContext'
import type { HabitMeasurementType } from '../../services'
import { useHabitItemMutation, useHabitsQuery } from '../../services/queries'
import { useDrawerForm } from '../shared/useDrawerForm'

export function HabitItemForm({ date, preferExisting = false, onClose }: { date: string; preferExisting?: boolean; onClose: () => void }) {
  const habits = useHabitsQuery()
  const mutation = useHabitItemMutation(date)
  const toast = useToast()
  const form = useDrawerForm({
    source: '',
    title: '',
    measurementType: 'check' as HabitMeasurementType,
    target: '1',
    unit: '',
  })
  const initializedExistingHabit = useRef(false)
  const formValues = form.values
  const replaceForm = form.replace
  useEffect(() => {
    if (initializedExistingHabit.current || !preferExisting || habits.data === undefined) return
    initializedExistingHabit.current = true
    const firstHabit = habits.data?.[0]
    if (firstHabit) {
      replaceForm({
        ...formValues,
        source: firstHabit.id,
        target: String(firstHabit.defaultDailyTarget),
      })
    }
  }, [formValues, habits.data, preferExisting, replaceForm])
  const selected = habits.data?.find((habit) => habit.id === form.values.source)
  const measurement = selected?.measurementType ?? form.values.measurementType

  async function submit() {
    const target = measurement === 'check' ? 1 : Number(form.values.target.replace(',', '.'))
    const errors: Record<string, string> = {}
    if (!selected && !form.values.title.trim()) errors.title = 'Informe a atividade.'
    if (measurement !== 'check' && (!Number.isFinite(target) || target <= 0)) {
      errors.target = 'Informe um alvo maior que zero.'
    }
    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }
    const ok = await form.submit(() =>
      mutation.mutateAsync(
        selected
          ? { habitId: selected.id, targetValue: target }
          : {
              title: form.values.title,
              measurementType: measurement,
              targetValue: target,
              unit: form.values.unit.trim() || null,
            },
      ),
    )
    if (ok) {
      toast.notify('Atividade adicionada ao dia')
      onClose()
    }
  }

  return (
    <FormDrawer
      title="Adicionar atividade"
      submitLabel="Adicionar"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
      footerNote={`A atividade será adicionada em ${date.split('-').reverse().join('/')}.`}
    >
      <SelectField label="Usar hábito existente" value={form.values.source} onChange={(event) => form.patch({ source: event.target.value, target: String(habits.data?.find((habit) => habit.id === event.target.value)?.defaultDailyTarget ?? 1) })}>
        <option value="">Atividade avulsa</option>
        {(habits.data ?? []).map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}
      </SelectField>
      {selected ? null : (
        <>
          <TextField label="Atividade" value={form.values.title} error={form.fieldErrors.title} maxLength={140} onChange={(event) => form.patch({ title: event.target.value })} />
          <SelectField label="Como medir" value={measurement} onChange={(event) => form.patch({ measurementType: event.target.value as HabitMeasurementType })}>
            <option value="check">Feito ou não feito</option>
            <option value="contagem">Quantidade</option>
            <option value="duracao">Duração</option>
          </SelectField>
        </>
      )}
      {measurement === 'check' ? null : (
        <TextField label={measurement === 'duracao' ? 'Alvo em minutos' : 'Alvo'} value={form.values.target} error={form.fieldErrors.target} inputMode="decimal" onChange={(event) => form.patch({ target: event.target.value })} />
      )}
      {!selected && measurement === 'contagem' ? (
        <TextField label="Unidade" value={form.values.unit} placeholder="páginas, copos, séries" maxLength={24} onChange={(event) => form.patch({ unit: event.target.value })} />
      ) : null}
    </FormDrawer>
  )
}
