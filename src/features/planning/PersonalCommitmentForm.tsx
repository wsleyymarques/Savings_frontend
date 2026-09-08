import { useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField, MoneyField, SelectField, TextField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useToast } from '../../components/ui/toastContext'
import { PAYMENT_METHOD_LABEL, type Id, type PaymentMethod } from '../../data/types'
import { formatAmountInput, parseMoney } from '../../lib/money'
import { today } from '../../lib/today'
import type { CardSummary, PersonalCommitmentInput, PersonalCommitmentSchedule } from '../../services'
import {
  useCardsQuery,
  useCommitmentMutation,
  useCommitmentQuery,
  useSelectableCategoriesQuery,
} from '../../services/queries'
import { DrawerRecord } from '../shared/DrawerFallback'
import { useDrawerForm } from '../shared/useDrawerForm'

export function PersonalCommitmentForm({ id, onClose }: { id?: Id; onClose: () => void }) {
  const query = useCommitmentQuery(id)
  const { accountId } = useScope()
  const { accounts } = useAccountScope()

  if (id) {
    return (
      <DrawerRecord title="Editar compromisso" query={query} onClose={onClose}>
        {(item) => (
          <CommitmentFields
            id={id}
            scheduleLocked={item.paidOccurrences > 0}
            initial={{
              beneficiaryName: item.beneficiaryName,
              description: item.description,
              amount: item.amount,
              accountId: item.accountId,
              cardId: item.cardId,
              categoryId: item.categoryId,
              method: item.method,
              schedule: item.schedule,
              startDate: item.startDate,
              installmentCount: item.installmentCount,
              endDate: item.endDate,
              includedInSimulation: item.includedInSimulation,
            }}
            onClose={onClose}
          />
        )}
      </DrawerRecord>
    )
  }

  return (
    <CommitmentFields
      initial={{
        beneficiaryName: '',
        description: '',
        amount: 0,
        accountId: accountId ?? accounts[0]?.id ?? null,
        cardId: null,
        categoryId: null,
        method: 'pix',
        schedule: 'recorrente',
        startDate: today(),
        installmentCount: null,
        endDate: null,
        includedInSimulation: true,
      }}
      onClose={onClose}
    />
  )
}

function CommitmentFields({
  id,
  initial,
  scheduleLocked = false,
  onClose,
}: {
  id?: Id
  initial: PersonalCommitmentInput
  scheduleLocked?: boolean
  onClose: () => void
}) {
  const { status } = useSession()
  const { accounts } = useAccountScope()
  const mutation = useCommitmentMutation(id)
  const toast = useToast()
  const cardsQuery = useCardsQuery({ accountId: null }, status === 'authenticated')
  const cards: CardSummary[] = cardsQuery.data?.items ?? []
  const form = useDrawerForm({
    beneficiaryName: initial.beneficiaryName,
    description: initial.description,
    amount: initial.amount ? formatAmountInput(initial.amount) : '',
    method: initial.method,
    accountId: initial.accountId ?? '',
    cardId: initial.cardId ?? '',
    categoryId: initial.categoryId ?? '',
    schedule: initial.schedule,
    startDate: initial.startDate,
    installmentCount: String(initial.installmentCount ?? 2),
    endDate: initial.endDate ?? '',
    includedInSimulation: initial.includedInSimulation,
  })

  const usesCard = form.values.method === 'debito' || form.values.method === 'credito'
  const selectedCard = cards.find((card) => card.id === form.values.cardId)
  const effectiveAccountId = usesCard ? (selectedCard?.accountId ?? '') : form.values.accountId
  const categoriesQuery = useSelectableCategoriesQuery({ accountId: effectiveAccountId || null })
  const categories = categoriesQuery.data ?? []
  const filteredCards = cards.filter((card) =>
    form.values.method === 'debito' ? card.functions !== 'credito' : card.functions !== 'debito',
  )

  function changeMethod(method: PaymentMethod) {
    form.patch({ method, cardId: '', categoryId: '' })
  }

  async function submit() {
    const amount = parseMoney(form.values.amount)
    const errors: Record<string, string> = {}
    if (!form.values.beneficiaryName.trim()) errors.beneficiaryName = 'Informe quem receberá.'
    if (!form.values.description.trim()) errors.description = 'Informe a descrição.'
    if (!amount.ok) errors.amount = amount.reason
    if (!effectiveAccountId) errors.accountId = usesCard ? 'Selecione um cartão.' : 'Selecione uma conta.'
    if (!form.values.categoryId) errors.categoryId = 'Selecione uma categoria.'
    if (form.values.schedule === 'parcelado') {
      const count = Number(form.values.installmentCount)
      if (!Number.isInteger(count) || count < 2 || count > 120) {
        errors.installmentCount = 'Informe entre 2 e 120 parcelas.'
      }
    }
    if (form.values.schedule === 'recorrente' && form.values.endDate
      && form.values.endDate < form.values.startDate) {
      errors.endDate = 'A data final deve ser posterior à primeira cobrança.'
    }
    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }

    const ok = await form.submit(() => mutation.mutateAsync({
      beneficiaryName: form.values.beneficiaryName,
      description: form.values.description,
      amount: amount.ok ? amount.cents : 0,
      accountId: usesCard ? null : form.values.accountId || null,
      cardId: usesCard ? form.values.cardId || null : null,
      categoryId: form.values.categoryId || null,
      method: form.values.method,
      schedule: form.values.schedule,
      startDate: form.values.startDate,
      installmentCount: form.values.schedule === 'parcelado'
        ? Number(form.values.installmentCount)
        : null,
      endDate: form.values.schedule === 'recorrente' ? form.values.endDate || null : null,
      includedInSimulation: form.values.includedInSimulation,
    }))
    if (ok) {
      toast.notify(id ? 'Compromisso atualizado' : 'Compromisso criado')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={id ? 'Editar compromisso' : 'Novo compromisso'}
      submitLabel={id ? 'Salvar' : 'Criar compromisso'}
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
    >
      <InlineAlert>
        Cada data será uma previsão. O saldo real só muda quando você registrar o pagamento.
      </InlineAlert>
      {scheduleLocked ? (
        <InlineAlert tone="warning">O calendário não pode mudar porque já há pagamentos registrados.</InlineAlert>
      ) : null}
      <TextField
        label="Quem receberá"
        value={form.values.beneficiaryName}
        error={form.fieldErrors.beneficiaryName}
        maxLength={100}
        onChange={(event) => form.patch({ beneficiaryName: event.target.value })}
      />
      <TextField
        label="Descrição"
        value={form.values.description}
        error={form.fieldErrors.description}
        maxLength={140}
        placeholder="Ajuda mensal, pagamento combinado…"
        onChange={(event) => form.patch({ description: event.target.value })}
      />
      <MoneyField
        label="Valor por pagamento"
        value={form.values.amount}
        error={form.fieldErrors.amount}
        onChange={(value) => form.patch({ amount: value })}
      />
      <SelectField
        label="Modalidade"
        value={form.values.schedule}
        disabled={scheduleLocked}
        onChange={(event) => form.patch({ schedule: event.target.value as PersonalCommitmentSchedule })}
      >
        <option value="recorrente">Recorrente</option>
        <option value="parcelado">Parcelado</option>
      </SelectField>
      <DateField
        label="Primeiro pagamento"
        value={form.values.startDate}
        disabled={scheduleLocked}
        onChange={(value) => form.patch({ startDate: value })}
      />
      {form.values.schedule === 'parcelado' ? (
        <TextField
          label="Quantidade de parcelas"
          type="number"
          min={2}
          max={120}
          disabled={scheduleLocked}
          value={form.values.installmentCount}
          error={form.fieldErrors.installmentCount}
          onChange={(event) => form.patch({ installmentCount: event.target.value })}
        />
      ) : (
        <DateField
          label="Data final (opcional)"
          value={form.values.endDate}
          error={form.fieldErrors.endDate}
          onChange={(value) => form.patch({ endDate: value })}
        />
      )}
      <SelectField
        label="Forma de pagamento"
        value={form.values.method}
        onChange={(event) => changeMethod(event.target.value as PaymentMethod)}
      >
        {(['pix', 'boleto', 'debito', 'credito'] as PaymentMethod[]).map((method) => (
          <option key={method} value={method}>{PAYMENT_METHOD_LABEL[method]}</option>
        ))}
      </SelectField>
      {usesCard ? (
        <SelectField
          label="Cartão"
          value={form.values.cardId}
          error={form.fieldErrors.accountId}
          placeholder="Selecione"
          onChange={(event) => form.patch({ cardId: event.target.value, categoryId: '' })}
        >
          {filteredCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
        </SelectField>
      ) : (
        <SelectField
          label="Conta"
          value={form.values.accountId}
          error={form.fieldErrors.accountId}
          placeholder="Selecione"
          onChange={(event) => form.patch({ accountId: event.target.value, categoryId: '' })}
        >
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </SelectField>
      )}
      <SelectField
        label="Categoria"
        value={form.values.categoryId}
        error={form.fieldErrors.categoryId}
        placeholder={effectiveAccountId ? 'Selecione' : 'Escolha conta ou cartão primeiro'}
        disabled={!effectiveAccountId}
        onChange={(event) => form.patch({ categoryId: event.target.value })}
      >
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </SelectField>
      <label className="planning-check">
        <input
          type="checkbox"
          checked={form.values.includedInSimulation}
          onChange={(event) => form.patch({ includedInSimulation: event.target.checked })}
        />
        Incluir as ocorrências nas previsões financeiras
      </label>
    </FormDrawer>
  )
}
