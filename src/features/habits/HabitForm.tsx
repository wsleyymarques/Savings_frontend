import { FormDrawer } from '../../components/layout/FormDrawer'
import { SelectField, TextField } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toastContext'
import type { HabitDefinition, HabitMeasurementType } from '../../services'
import { useHabitMutation, useHabitsQuery } from '../../services/queries'
import type { Id } from '../../data/types'
import { useDrawerForm } from '../shared/useDrawerForm'
import { DrawerRecord } from '../shared/DrawerFallback'

export function HabitForm({ habitId, onClose }: { habitId?: Id; onClose: () => void }) {
  const query = useHabitsQuery(true)
  if (!habitId) return <HabitFields onClose={onClose} />
  return (
    <DrawerRecord title="Editar hábito" query={query} onClose={onClose}>
      {(habits) => {
        const habit = habits.find((item) => item.id === habitId)
        return habit ? <HabitFields habit={habit} onClose={onClose} /> : null
      }}
    </DrawerRecord>
  )
}

function HabitFields({ habit, onClose }: { habit?: HabitDefinition; onClose: () => void }) {
  const mutation = useHabitMutation(habit?.id)
  const toast = useToast()
  const form = useDrawerForm({
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    color: habit?.color ?? '#6D5BD0',
    measurementType: habit?.measurementType ?? ('check' as HabitMeasurementType),
    unit: habit?.unit ?? '',
    target: String(habit?.defaultDailyTarget ?? 1),
  })
  const measurement = form.values.measurementType

  async function submit() {
    const target = measurement === 'check' ? 1 : Number(form.values.target.replace(',', '.'))
    const errors: Record<string, string> = {}
    if (!form.values.name.trim()) errors.name = 'Informe o nome do hábito.'
    if (measurement !== 'check' && (!Number.isFinite(target) || target <= 0)) {
      errors.target = 'Informe um alvo maior que zero.'
    }
    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }
    const ok = await form.submit(() =>
      mutation.mutateAsync({
        name: form.values.name,
        description: form.values.description.trim() || null,
        color: form.values.color || null,
        measurementType: measurement,
        unit: measurement === 'contagem' ? form.values.unit.trim() || 'vezes' : null,
        defaultDailyTarget: target,
      }),
    )
    if (ok) {
      toast.notify(habit ? 'Hábito atualizado' : 'Hábito criado')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={habit ? 'Editar hábito' : 'Novo hábito'}
      submitLabel={habit ? 'Salvar' : 'Criar hábito'}
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField label="Nome" value={form.values.name} error={form.fieldErrors.name} maxLength={140} onChange={(event) => form.patch({ name: event.target.value })} />
      <SelectField label="Como medir" value={measurement} onChange={(event) => form.patch({ measurementType: event.target.value as HabitMeasurementType })}>
        <option value="check">Feito ou não feito</option>
        <option value="contagem">Quantidade</option>
        <option value="duracao">Duração</option>
      </SelectField>
      {measurement === 'check' ? null : (
        <TextField
          label={measurement === 'duracao' ? 'Alvo diário em minutos' : 'Alvo diário'}
          value={form.values.target}
          error={form.fieldErrors.target}
          inputMode="decimal"
          onChange={(event) => form.patch({ target: event.target.value })}
        />
      )}
      {measurement === 'contagem' ? (
        <TextField label="Unidade" value={form.values.unit} placeholder="páginas, copos, séries" maxLength={24} onChange={(event) => form.patch({ unit: event.target.value })} />
      ) : null}
      <TextField label="Cor" type="color" value={form.values.color} onChange={(event) => form.patch({ color: event.target.value })} />
      <TextField label="Descrição (opcional)" value={form.values.description} maxLength={1000} onChange={(event) => form.patch({ description: event.target.value })} />
    </FormDrawer>
  )
}
