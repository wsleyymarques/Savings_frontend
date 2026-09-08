import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField, SelectField, TextField } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toastContext'
import { formatDate } from '../../lib/date'
import { formatGoalValue, parseDecimalInput } from '../../lib/goals'
import type { GoalObjectiveRecord } from '../../services'
import { useGoalObjectiveQuery, useGoalProgressMutation } from '../../services/queries'
import type { Id } from '../../data/types'
import { DrawerRecord } from '../shared/DrawerFallback'
import { useDrawerForm } from '../shared/useDrawerForm'

interface GoalProgressFormProps {
  objectiveId: Id
  onClose: () => void
}

export function GoalProgressForm({ objectiveId, onClose }: GoalProgressFormProps) {
  const query = useGoalObjectiveQuery(objectiveId)
  return (
    <DrawerRecord title="Registrar progresso" query={query} onClose={onClose}>
      {(objective) => <ProgressFields objective={objective} onClose={onClose} />}
    </DrawerRecord>
  )
}

function ProgressFields({
  objective,
  onClose,
}: {
  objective: GoalObjectiveRecord
  onClose: () => void
}) {
  const mutation = useGoalProgressMutation(objective.id)
  const toast = useToast()
  const form = useDrawerForm({
    occurredOn: withinCycle(new Date().toISOString().slice(0, 10), objective),
    value: objective.metricType === 'conclusao' ? '1' : '',
    note: '',
  })

  const incremental = objective.metricType === 'contagem' || objective.metricType === 'valor'

  async function submit() {
    const errors: Record<string, string> = {}
    if (!form.values.occurredOn) errors.occurredOn = 'Informe a data do fato.'
    else if (
      form.values.occurredOn < objective.cycleStartDate ||
      form.values.occurredOn > objective.cycleEndDate
    ) {
      errors.occurredOn = 'A data precisa estar dentro do período do ciclo.'
    }

    const parsed = parseDecimalInput(form.values.value, {
      min: objective.metricType === 'contagem' ? 0.01 : 0,
      max: objective.metricType === 'percentual' ? 100 : undefined,
      label: 'valor',
    })
    if (!parsed.ok) errors.value = parsed.reason

    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }

    const ok = await form.submit(() =>
      mutation.mutateAsync({
        occurredOn: form.values.occurredOn,
        value: parsed.ok ? parsed.value : 0,
        note: form.values.note.trim() || null,
      }),
    )

    if (ok) {
      toast.notify('Progresso registrado')
      onClose()
    }
  }

  return (
    <FormDrawer
      title="Registrar progresso"
      submitLabel="Registrar"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
      footerNote={
        incremental
          ? 'O valor é somado ao que já foi registrado.'
          : 'O valor substitui a leitura anterior.'
      }
    >
      <div className="drawer__summary">
        <div className="drawer__summary-row">
          <span>{objective.title}</span>
          <span>
            {formatGoalValue(objective.currentValue, objective.unit)} de{' '}
            {formatGoalValue(objective.targetValue, objective.unit)}
          </span>
        </div>
      </div>

      <DateField
        label="Data"
        value={form.values.occurredOn}
        error={form.fieldErrors.occurredOn}
        hint={`Entre ${formatDate(objective.cycleStartDate)} e ${formatDate(objective.cycleEndDate)}.`}
        onChange={(value) => form.patch({ occurredOn: value })}
      />

      {objective.metricType === 'conclusao' ? (
        <SelectField
          label="Situação"
          value={form.values.value}
          onChange={(event) => form.patch({ value: event.target.value })}
        >
          <option value="1">Concluído</option>
          <option value="0">Não concluído</option>
        </SelectField>
      ) : (
        <TextField
          label={incremental ? 'Quanto avançou' : 'Leitura atual'}
          value={form.values.value}
          error={form.fieldErrors.value}
          inputMode="decimal"
          hint={
            incremental
              ? 'Incremento desta vez, não o total acumulado.'
              : 'Valor medido nesta data.'
          }
          onChange={(event) => form.patch({ value: event.target.value })}
        />
      )}

      <TextField
        label="Observação (opcional)"
        value={form.values.note}
        maxLength={500}
        onChange={(event) => form.patch({ note: event.target.value })}
      />
    </FormDrawer>
  )
}

/** Hoje, ou o extremo mais próximo quando a data está fora do ciclo. */
function withinCycle(date: string, objective: GoalObjectiveRecord): string {
  if (date < objective.cycleStartDate) return objective.cycleStartDate
  if (date > objective.cycleEndDate) return objective.cycleEndDate
  return date
}
