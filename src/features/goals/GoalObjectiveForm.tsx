import { FormDrawer } from '../../components/layout/FormDrawer'
import { SelectField, TextField } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toastContext'
import { formatDecimalInput, parseDecimalInput, METRIC_LABEL } from '../../lib/goals'
import type { GoalAggregation, GoalCadence, GoalDirection, GoalEvaluationMode, GoalMetricType, GoalObjectiveInput, GoalSourceType } from '../../services'
import { useGoalObjectiveMutation, useGoalObjectiveQuery, useHabitsQuery } from '../../services/queries'
import type { Id } from '../../data/types'
import { DrawerRecord } from '../shared/DrawerFallback'
import { useDrawerForm } from '../shared/useDrawerForm'

interface GoalObjectiveFormProps {
  cycleId: Id
  objectiveId?: Id
  onClose: () => void
}

export function GoalObjectiveForm({ cycleId, objectiveId, onClose }: GoalObjectiveFormProps) {
  const query = useGoalObjectiveQuery(objectiveId)

  if (!objectiveId) {
    return (
      <ObjectiveFields
        cycleId={cycleId}
        initial={{
          title: '',
          description: null,
          metricType: 'contagem',
          direction: 'aumentar',
          baselineValue: 0,
          targetValue: 0,
          unit: null,
          weight: 1,
          expectedErrorMargin: null,
          sourceBinding: null,
        }}
        onClose={onClose}
      />
    )
  }

  return (
    <DrawerRecord title="Editar objetivo" query={query} onClose={onClose}>
      {(objective) => (
        <ObjectiveFields
          cycleId={cycleId}
          objectiveId={objective.id}
          initial={{
            title: objective.title,
            description: objective.description,
            metricType: objective.metricType,
            direction: objective.direction,
            baselineValue: objective.baselineValue,
            targetValue: objective.targetValue,
            unit: objective.unit,
            weight: objective.weight,
            expectedErrorMargin: objective.expectedErrorMargin,
            parentObjectiveId: objective.parentObjectiveId ?? null,
            sourceBinding: objective.sourceBinding ?? null,
          }}
          onClose={onClose}
        />
      )}
    </DrawerRecord>
  )
}

function ObjectiveFields({
  cycleId,
  objectiveId,
  initial,
  onClose,
}: {
  cycleId: Id
  objectiveId?: Id
  initial: GoalObjectiveInput
  onClose: () => void
}) {
  const mutation = useGoalObjectiveMutation(cycleId, objectiveId)
  const habits = useHabitsQuery()
  const toast = useToast()
  const form = useDrawerForm({
    title: initial.title,
    description: initial.description ?? '',
    metricType: initial.metricType,
    direction: initial.direction,
    baselineValue: formatDecimalInput(initial.baselineValue),
    targetValue: initial.targetValue ? formatDecimalInput(initial.targetValue) : '',
    unit: initial.unit ?? '',
    weight: formatDecimalInput(initial.weight),
    expectedErrorMargin:
      initial.expectedErrorMargin === null ? '' : formatDecimalInput(initial.expectedErrorMargin),
    sourceType: initial.sourceBinding?.sourceType ?? ('manual' as GoalSourceType),
    sourceId: initial.sourceBinding?.sourceIds[0] ?? '',
    aggregation: initial.sourceBinding?.aggregation ?? ('dias-concluidos' as GoalAggregation),
    evaluationMode: initial.sourceBinding?.evaluationMode ?? ('total' as GoalEvaluationMode),
    cadence: initial.sourceBinding?.cadence ?? ('semanal' as GoalCadence),
    targetPerWindow: initial.sourceBinding?.targetPerWindow
      ? formatDecimalInput(initial.sourceBinding.targetPerWindow)
      : '3',
  })

  const automatic = form.values.sourceType === 'habits'
  const selectedHabit = habits.data?.find((habit) => habit.id === form.values.sourceId)
  const metricType = automatic
    ? form.values.aggregation === 'duracao' || form.values.aggregation === 'soma'
      ? 'valor'
      : 'contagem'
    : form.values.metricType
  // Conclusão não tem alvo numérico; contagem sempre cresce a partir da linha de base.
  const isCompletion = metricType === 'conclusao'
  const allowsDirection = metricType === 'valor' || metricType === 'percentual'
  const direction = automatic ? 'aumentar' : allowsDirection ? form.values.direction : 'aumentar'
  const maxValue = metricType === 'percentual' ? 100 : undefined

  async function submit() {
    const errors: Record<string, string> = {}
    if (!form.values.title.trim()) errors.title = 'Informe o objetivo.'
    if (automatic && !form.values.sourceId) errors.sourceId = 'Selecione o hábito.'

    const weight = parseDecimalInput(form.values.weight, { min: 0.01, label: 'peso' })
    if (!weight.ok) errors.weight = weight.reason

    let baselineValue = 0
    let targetValue = 1
    if (!isCompletion) {
      const baseline = parseDecimalInput(form.values.baselineValue, {
        min: 0,
        max: maxValue,
        label: 'valor',
      })
      const targetSource = automatic && form.values.evaluationMode === 'recorrente'
        ? form.values.targetPerWindow
        : form.values.targetValue
      const target = parseDecimalInput(targetSource, {
        min: 0,
        max: maxValue,
        label: 'alvo',
      })
      if (!baseline.ok) errors.baselineValue = baseline.reason
      if (!target.ok) errors.targetValue = target.reason
      if (baseline.ok && target.ok) {
        baselineValue = automatic ? 0 : baseline.value
        targetValue = target.value
        if (direction === 'reduzir' && baselineValue <= targetValue) {
          errors.targetValue = 'Em uma redução o alvo precisa ser menor que a linha de base.'
        }
        if (direction === 'aumentar' && targetValue <= baselineValue) {
          errors.targetValue = 'O alvo precisa ser maior que a linha de base.'
        }
      }
    }

    let margin: number | null = null
    if (form.values.expectedErrorMargin.trim()) {
      const parsed = parseDecimalInput(form.values.expectedErrorMargin, {
        min: 0,
        max: 100,
        label: 'percentual',
      })
      if (!parsed.ok) errors.expectedErrorMargin = parsed.reason
      else margin = parsed.value
    }

    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }

    const ok = await form.submit(() =>
      mutation.mutateAsync({
        title: form.values.title,
        description: form.values.description.trim() || null,
        metricType,
        direction,
        baselineValue,
        targetValue,
        unit: isCompletion ? null : form.values.unit.trim() || null,
        weight: weight.ok ? weight.value : 1,
        expectedErrorMargin: margin,
        parentObjectiveId: initial.parentObjectiveId ?? null,
        sourceBinding: automatic
          ? {
              sourceType: 'habits',
              sourceIds: [form.values.sourceId],
              aggregation: form.values.aggregation,
              evaluationMode: form.values.evaluationMode,
              cadence: form.values.evaluationMode === 'recorrente' ? form.values.cadence : null,
              targetPerWindow:
                form.values.evaluationMode === 'recorrente'
                  ? Number(form.values.targetPerWindow.replace(',', '.'))
                  : null,
              allowCarryover: false,
            }
          : null,
      }),
    )

    if (ok) {
      toast.notify(objectiveId ? 'Objetivo atualizado' : 'Objetivo adicionado')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={objectiveId ? 'Editar objetivo' : 'Novo objetivo'}
      submitLabel={objectiveId ? 'Salvar' : 'Adicionar objetivo'}
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
      footerNote="O erro do objetivo é a distância entre o resultado e o alvo, com peso na margem do ciclo."
    >
      <TextField
        label="Objetivo"
        value={form.values.title}
        error={form.fieldErrors.title}
        maxLength={140}
        onChange={(event) => form.patch({ title: event.target.value })}
      />
      <SelectField label="Origem do progresso" value={form.values.sourceType} onChange={(event) => form.patch({ sourceType: event.target.value as GoalSourceType })}>
        <option value="manual">Lançamento manual</option>
        <option value="habits">Automático pelo Habits</option>
      </SelectField>

      {automatic ? (
        <>
          <SelectField label="Hábito" value={form.values.sourceId} error={form.fieldErrors.sourceId} placeholder="Selecione" onChange={(event) => {
            const habit = habits.data?.find((item) => item.id === event.target.value)
            form.patch({
              sourceId: event.target.value,
              aggregation: habit?.measurementType === 'duracao' ? 'duracao' : 'dias-concluidos',
              unit: habit?.measurementType === 'duracao' ? 'min' : 'dias',
            })
          }}>
            {(habits.data ?? []).map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}
          </SelectField>
          <SelectField label="Como agregar" value={form.values.aggregation} onChange={(event) => form.patch({ aggregation: event.target.value as GoalAggregation })}>
            <option value="dias-concluidos">Dias concluídos</option>
            <option value="ocorrencias">Execuções</option>
            {selectedHabit?.measurementType === 'duracao' ? <option value="duracao">Duração em minutos</option> : null}
            {selectedHabit?.measurementType === 'contagem' ? <option value="soma">Somar quantidades</option> : null}
          </SelectField>
          <SelectField label="Forma de avaliação" value={form.values.evaluationMode} onChange={(event) => form.patch({ evaluationMode: event.target.value as GoalEvaluationMode })}>
            <option value="total">Total no período</option>
            <option value="recorrente">Meta recorrente</option>
          </SelectField>
          {form.values.evaluationMode === 'recorrente' ? (
            <>
              <SelectField label="Frequência" value={form.values.cadence} onChange={(event) => form.patch({ cadence: event.target.value as GoalCadence })}>
                <option value="diaria">Diária</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </SelectField>
              <TextField label="Mínimo por período" value={form.values.targetPerWindow} error={form.fieldErrors.targetValue} inputMode="decimal" hint="Ex.: 3 dias por semana ou 300 minutos por semana." onChange={(event) => form.patch({ targetPerWindow: event.target.value })} />
            </>
          ) : null}
        </>
      ) : <SelectField
        label="Como medir"
        value={metricType}
        hint={METRIC_HINT[metricType]}
        onChange={(event) => form.patch({ metricType: event.target.value as GoalMetricType })}
      >
        {(Object.keys(METRIC_LABEL) as GoalMetricType[]).map((type) => (
          <option key={type} value={type}>
            {METRIC_LABEL[type]}
          </option>
        ))}
      </SelectField>}

      {allowsDirection ? (
        <SelectField
          label="Direção"
          value={form.values.direction}
          onChange={(event) => form.patch({ direction: event.target.value as GoalDirection })}
        >
          <option value="aumentar">Aumentar até o alvo</option>
          <option value="reduzir">Reduzir até o alvo</option>
        </SelectField>
      ) : null}

      {isCompletion ? null : (
        <>
          {!automatic ? <TextField
            label={direction === 'reduzir' ? 'Linha de base (hoje)' : 'Ponto de partida'}
            value={form.values.baselineValue}
            error={form.fieldErrors.baselineValue}
            inputMode="decimal"
            hint={
              direction === 'reduzir'
                ? 'Valor atual, antes de começar a reduzir.'
                : 'Normalmente zero.'
            }
            onChange={(event) => form.patch({ baselineValue: event.target.value })}
          /> : null}
          {automatic && form.values.evaluationMode === 'recorrente' ? null : <TextField
            label="Alvo"
            value={form.values.targetValue}
            error={form.fieldErrors.targetValue}
            inputMode="decimal"
            onChange={(event) => form.patch({ targetValue: event.target.value })}
          />}
          {!automatic ? <TextField
            label="Unidade (opcional)"
            value={form.values.unit}
            maxLength={24}
            placeholder={metricType === 'percentual' ? '%' : 'dias, dívidas, R$'}
            onChange={(event) => form.patch({ unit: event.target.value })}
          /> : null}
        </>
      )}

      <TextField
        label="Peso"
        value={form.values.weight}
        error={form.fieldErrors.weight}
        inputMode="decimal"
        hint="Quanto este objetivo pesa na margem do ciclo. Use 1 para todos terem o mesmo peso."
        onChange={(event) => form.patch({ weight: event.target.value })}
      />
      <TextField
        label="Margem de erro própria (%) (opcional)"
        value={form.values.expectedErrorMargin}
        error={form.fieldErrors.expectedErrorMargin}
        inputMode="decimal"
        hint="Em branco, herda a margem do ciclo."
        onChange={(event) => form.patch({ expectedErrorMargin: event.target.value })}
      />
      <TextField
        label="Descrição (opcional)"
        value={form.values.description}
        maxLength={1000}
        onChange={(event) => form.patch({ description: event.target.value })}
      />
    </FormDrawer>
  )
}

const METRIC_HINT: Record<GoalMetricType, string> = {
  conclusao: 'Feito ou não feito, sem resultado parcial.',
  contagem: 'Soma ocorrências até o alvo, como estudar 45 dias.',
  valor: 'Valor a alcançar ou a reduzir, como dívidas a quitar.',
  percentual: 'Proporção entre 0 e 100, como a fatia dos gastos no crédito.',
}
