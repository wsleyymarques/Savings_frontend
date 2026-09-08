import { useNavigate } from 'react-router-dom'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField, TextField } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toastContext'
import { formatDecimalInput, parseDecimalInput } from '../../lib/goals'
import { useGoalCycleMutation, useGoalCycleQuery } from '../../services/queries'
import type { GoalCycleInput } from '../../services'
import type { Id } from '../../data/types'
import { DrawerRecord } from '../shared/DrawerFallback'
import { useDrawerForm } from '../shared/useDrawerForm'

interface GoalCycleFormProps {
  cycleId?: Id
  onClose: () => void
}

export function GoalCycleForm({ cycleId, onClose }: GoalCycleFormProps) {
  const query = useGoalCycleQuery(cycleId)

  if (!cycleId) {
    const { start, end } = currentQuarter()
    return (
      <CycleFields
        initial={{
          name: quarterName(start),
          startDate: start,
          endDate: end,
          expectedErrorMargin: 10,
          note: null,
        }}
        onClose={onClose}
      />
    )
  }

  return (
    <DrawerRecord title="Editar ciclo" query={query} onClose={onClose}>
      {(cycle) => (
        <CycleFields
          cycleId={cycle.id}
          initial={{
            name: cycle.name,
            startDate: cycle.startDate,
            endDate: cycle.endDate,
            expectedErrorMargin: cycle.expectedErrorMargin,
            note: cycle.note,
          }}
          onClose={onClose}
        />
      )}
    </DrawerRecord>
  )
}

function CycleFields({
  cycleId,
  initial,
  onClose,
}: {
  cycleId?: Id
  initial: GoalCycleInput
  onClose: () => void
}) {
  const mutation = useGoalCycleMutation(cycleId)
  const toast = useToast()
  const navigate = useNavigate()
  const form = useDrawerForm({
    name: initial.name,
    startDate: initial.startDate,
    endDate: initial.endDate,
    expectedErrorMargin: formatDecimalInput(initial.expectedErrorMargin),
    note: initial.note ?? '',
  })

  async function submit() {
    const margin = parseDecimalInput(form.values.expectedErrorMargin, {
      min: 0,
      max: 100,
      label: 'percentual',
    })
    const errors: Record<string, string> = {}
    if (!form.values.name.trim()) errors.name = 'Informe o nome do ciclo.'
    if (!form.values.startDate) errors.startDate = 'Informe o início do ciclo.'
    if (!form.values.endDate) errors.endDate = 'Informe o fim do ciclo.'
    if (form.values.endDate && form.values.endDate < form.values.startDate) {
      errors.endDate = 'O fim não pode ser anterior ao início.'
    }
    if (!margin.ok) errors.expectedErrorMargin = margin.reason
    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }

    let createdId: Id | null = null
    const ok = await form.submit(async () => {
      const id = await mutation.mutateAsync({
        name: form.values.name,
        startDate: form.values.startDate,
        endDate: form.values.endDate,
        expectedErrorMargin: margin.ok ? margin.value : 0,
        note: form.values.note.trim() || null,
      })
      if (!cycleId) createdId = id
    })

    if (ok) {
      toast.notify(cycleId ? 'Ciclo atualizado' : 'Ciclo criado')
      onClose()
      if (createdId) navigate(`/metas/${createdId}`)
    }
  }

  return (
    <FormDrawer
      title={cycleId ? 'Editar ciclo' : 'Novo ciclo'}
      submitLabel={cycleId ? 'Salvar' : 'Criar ciclo'}
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
      footerNote="A margem de erro esperada é o quanto você aceita ficar aquém dos alvos deste ciclo."
    >
      <TextField
        label="Nome do ciclo"
        value={form.values.name}
        error={form.fieldErrors.name}
        maxLength={120}
        onChange={(event) => form.patch({ name: event.target.value })}
      />
      <DateField
        label="Início"
        value={form.values.startDate}
        error={form.fieldErrors.startDate}
        onChange={(value) => form.patch({ startDate: value })}
      />
      <DateField
        label="Fim"
        value={form.values.endDate}
        error={form.fieldErrors.endDate}
        onChange={(value) => form.patch({ endDate: value })}
      />
      <TextField
        label="Margem de erro esperada (%)"
        value={form.values.expectedErrorMargin}
        error={form.fieldErrors.expectedErrorMargin}
        inputMode="decimal"
        hint="Percentual de 0 a 100. Ao encerrar o ciclo, a margem real é comparada com este número."
        onChange={(event) => form.patch({ expectedErrorMargin: event.target.value })}
      />
      <TextField
        label="Observações (opcional)"
        value={form.values.note}
        maxLength={1000}
        onChange={(event) => form.patch({ note: event.target.value })}
      />
    </FormDrawer>
  )
}

/** Trimestre corrente como sugestão inicial; o período continua livre. */
function currentQuarter(): { start: string; end: string } {
  const now = new Date()
  const year = now.getUTCFullYear()
  const firstMonth = Math.floor(now.getUTCMonth() / 3) * 3
  const start = new Date(Date.UTC(year, firstMonth, 1))
  const end = new Date(Date.UTC(year, firstMonth + 3, 0))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

function quarterName(start: string): string {
  const month = Number(start.slice(5, 7))
  return `${Math.floor((month - 1) / 3) + 1}º trimestre de ${start.slice(0, 4)}`
}
