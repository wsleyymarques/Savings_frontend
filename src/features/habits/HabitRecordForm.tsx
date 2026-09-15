import { FormDrawer } from '../../components/layout/FormDrawer'
import { TextField } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toastContext'
import type { HabitDailyItem } from '../../services'
import { useHabitRecordMutation } from '../../services/queries'
import { useDrawerForm } from '../shared/useDrawerForm'

export function HabitRecordForm({ item, onClose }: { item: HabitDailyItem; onClose: () => void }) {
  const mutation = useHabitRecordMutation(item.id)
  const toast = useToast()
  const form = useDrawerForm({ value: '', startedAt: '', endedAt: '', note: '' })
  const usesTime = item.measurementType === 'duracao' && (form.values.startedAt || form.values.endedAt)

  async function submit() {
    const value = Number(form.values.value.replace(',', '.'))
    const errors: Record<string, string> = {}
    if (usesTime) {
      if (!form.values.startedAt) errors.startedAt = 'Informe o início.'
      if (!form.values.endedAt) errors.endedAt = 'Informe o fim.'
      if (form.values.startedAt && form.values.endedAt && form.values.endedAt <= form.values.startedAt) {
        errors.endedAt = 'O fim deve ser posterior ao início.'
      }
    } else if (!Number.isFinite(value) || value <= 0) {
      errors.value = 'Informe um valor maior que zero.'
    }
    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }
    const ok = await form.submit(() => mutation.mutateAsync({
      value: usesTime ? undefined : value,
      startedAt: usesTime ? new Date(form.values.startedAt).toISOString() : undefined,
      endedAt: usesTime ? new Date(form.values.endedAt).toISOString() : undefined,
      note: form.values.note.trim() || null,
    }))
    if (ok) {
      toast.notify('Execução registrada')
      onClose()
    }
  }

  return (
    <FormDrawer title={`Registrar ${item.title}`} submitLabel="Registrar" dirty={form.dirty} submitting={form.submitting} error={form.formError} onSubmit={submit} onClose={onClose}>
      {item.measurementType === 'duracao' ? (
        <>
          <TextField label="Início (opcional)" type="datetime-local" value={form.values.startedAt} error={form.fieldErrors.startedAt} onChange={(event) => form.patch({ startedAt: event.target.value })} />
          <TextField label="Fim (opcional)" type="datetime-local" value={form.values.endedAt} error={form.fieldErrors.endedAt} onChange={(event) => form.patch({ endedAt: event.target.value })} />
          <TextField label="Duração em minutos" value={form.values.value} error={form.fieldErrors.value} disabled={Boolean(usesTime)} inputMode="decimal" hint="Preencha a duração ou informe início e fim." onChange={(event) => form.patch({ value: event.target.value })} />
        </>
      ) : (
        <TextField label={`Quantidade${item.unit ? ` (${item.unit})` : ''}`} value={form.values.value} error={form.fieldErrors.value} inputMode="decimal" onChange={(event) => form.patch({ value: event.target.value })} />
      )}
      <TextField label="Observação (opcional)" value={form.values.note} maxLength={500} onChange={(event) => form.patch({ note: event.target.value })} />
    </FormDrawer>
  )
}
