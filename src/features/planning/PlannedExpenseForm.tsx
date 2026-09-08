import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField, MoneyField, SelectField, TextField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useToast } from '../../components/ui/toastContext'
import { useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { formatAmountInput, parseMoney } from '../../lib/money'
import { today } from '../../lib/today'
import {
  useCardsQuery,
  usePlannedExpenseMutation,
  usePlannedExpenseQuery,
  useSelectableCategoriesQuery,
  useWishQuery,
} from '../../services/queries'
import type { CardSummary, PlannedExpenseInput } from '../../services'
import { PAYMENT_METHOD_LABEL, type Id, type PaymentMethod } from '../../data/types'
import { DrawerRecord } from '../shared/DrawerFallback'
import { useDrawerForm } from '../shared/useDrawerForm'

interface PlannedExpenseFormProps {
  plannedExpenseId?: Id
  wishId?: Id
  onClose: () => void
}

export function PlannedExpenseForm({ plannedExpenseId, wishId, onClose }: PlannedExpenseFormProps) {
  const plannedQuery = usePlannedExpenseQuery(plannedExpenseId)
  const wishQuery = useWishQuery(wishId)
  const { accountId } = useScope()
  const { accounts } = useAccountScope()

  if (plannedExpenseId) {
    return (
      <DrawerRecord title="Editar gasto planejado" query={plannedQuery} onClose={onClose}>
        {(item) => (
          <PlannedExpenseFields
            plannedExpenseId={item.id}
            initial={{
              wishItemId: item.wishItemId,
              accountId: item.accountId,
              cardId: item.cardId,
              categoryId: item.categoryId,
              description: item.description,
              amount: item.amount,
              plannedDate: item.plannedDate,
              method: item.method,
              expenseMode: item.expenseMode,
              installmentCount: item.installmentCount,
              includedInSimulation: item.includedInSimulation,
            }}
            onClose={onClose}
          />
        )}
      </DrawerRecord>
    )
  }

  if (wishId) {
    return (
      <DrawerRecord title="Planejar desejo" query={wishQuery} onClose={onClose}>
        {(wish) => (
          <PlannedExpenseFields
            initial={{
              wishItemId: wish.id,
              accountId: accountId ?? accounts[0]?.id ?? null,
              cardId: null,
              categoryId: null,
              description: wish.description,
              amount: wish.estimatedAmount,
              plannedDate: wish.desiredDate ?? today(),
              method: 'pix',
              expenseMode: 'unica',
              installmentCount: null,
              includedInSimulation: true,
            }}
            onClose={onClose}
          />
        )}
      </DrawerRecord>
    )
  }

  return (
    <PlannedExpenseFields
      initial={{
        wishItemId: null,
        accountId: accountId ?? accounts[0]?.id ?? null,
        cardId: null,
        categoryId: null,
        description: '',
        amount: 0,
        plannedDate: today(),
        method: 'pix',
        expenseMode: 'unica',
        installmentCount: null,
        includedInSimulation: true,
      }}
      onClose={onClose}
    />
  )
}

function PlannedExpenseFields({
  plannedExpenseId,
  initial,
  onClose,
}: {
  plannedExpenseId?: Id
  initial: PlannedExpenseInput
  onClose: () => void
}) {
  const { status } = useSession()
  const { accounts } = useAccountScope()
  const mutation = usePlannedExpenseMutation(plannedExpenseId)
  const toast = useToast()
  const cardsQuery = useCardsQuery({ accountId: null }, status === 'authenticated')
  const cards: CardSummary[] = cardsQuery.data?.items ?? []
  const form = useDrawerForm({
    description: initial.description,
    amount: initial.amount ? formatAmountInput(initial.amount) : '',
    plannedDate: initial.plannedDate,
    method: initial.method,
    accountId: initial.accountId ?? '',
    cardId: initial.cardId ?? '',
    categoryId: initial.categoryId ?? '',
    expenseMode: initial.expenseMode,
    installmentCount: String(initial.installmentCount ?? 2),
    includedInSimulation: initial.includedInSimulation,
  })

  const usesCard = form.values.method === 'debito' || form.values.method === 'credito'
  const selectedCard = cards.find((card) => card.id === form.values.cardId)
  const effectiveAccountId = usesCard ? (selectedCard?.accountId ?? '') : form.values.accountId
  const categoriesQuery = useSelectableCategoriesQuery({ accountId: effectiveAccountId || null })
  const categories = categoriesQuery.data ?? []
  const eligibleCards = cards.filter((card) =>
    form.values.method === 'debito' ? card.functions !== 'credito' : card.functions !== 'debito',
  )

  function changeMethod(method: PaymentMethod) {
    form.patch({
      method,
      cardId: '',
      categoryId: '',
      expenseMode: method === 'credito' ? form.values.expenseMode : 'unica',
    })
  }

  async function submit() {
    const amount = parseMoney(form.values.amount)
    const errors: Record<string, string> = {}
    if (!form.values.description.trim()) errors.description = 'Informe a descrição.'
    if (!amount.ok) errors.amount = amount.reason
    if (!effectiveAccountId) errors.accountId = usesCard ? 'Selecione um cartão.' : 'Selecione uma conta.'
    if (!form.values.categoryId) errors.categoryId = 'Selecione uma categoria.'
    if (form.values.expenseMode === 'parcelada') {
      const count = Number(form.values.installmentCount)
      if (!Number.isInteger(count) || count < 2 || count > 48) {
        errors.installmentCount = 'Informe entre 2 e 48 parcelas.'
      }
    }
    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }

    const ok = await form.submit(() =>
      mutation.mutateAsync({
        wishItemId: initial.wishItemId,
        accountId: usesCard ? null : form.values.accountId || null,
        cardId: usesCard ? form.values.cardId || null : null,
        categoryId: form.values.categoryId || null,
        description: form.values.description,
        amount: amount.ok ? amount.cents : 0,
        plannedDate: form.values.plannedDate,
        method: form.values.method,
        expenseMode: form.values.method === 'credito' ? form.values.expenseMode : 'unica',
        installmentCount:
          form.values.expenseMode === 'parcelada' ? Number(form.values.installmentCount) : null,
        includedInSimulation: form.values.includedInSimulation,
      }),
    )
    if (ok) {
      toast.notify(plannedExpenseId ? 'Planejamento atualizado' : 'Gasto planejado')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={plannedExpenseId ? 'Editar gasto planejado' : 'Novo gasto planejado'}
      submitLabel={plannedExpenseId ? 'Salvar' : 'Planejar gasto'}
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
    >
      <InlineAlert>
        Este gasto entra somente na simulação. Seu saldo e limite reais não mudam até você registrar a compra.
      </InlineAlert>
      <TextField
        label="Descrição"
        value={form.values.description}
        error={form.fieldErrors.description}
        maxLength={140}
        onChange={(event) => form.patch({ description: event.target.value })}
      />
      <MoneyField
        label="Valor estimado"
        value={form.values.amount}
        error={form.fieldErrors.amount}
        onChange={(value) => form.patch({ amount: value })}
      />
      <DateField
        label="Data prevista"
        value={form.values.plannedDate}
        onChange={(value) => form.patch({ plannedDate: value })}
      />
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
          {eligibleCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
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
      {form.values.method === 'credito' ? (
        <SelectField
          label="Tipo de compra"
          value={form.values.expenseMode}
          onChange={(event) => form.patch({ expenseMode: event.target.value as 'unica' | 'parcelada' })}
        >
          <option value="unica">À vista</option>
          <option value="parcelada">Parcelada</option>
        </SelectField>
      ) : null}
      {form.values.method === 'credito' && form.values.expenseMode === 'parcelada' ? (
        <TextField
          label="Número de parcelas"
          type="number"
          min={2}
          max={48}
          value={form.values.installmentCount}
          error={form.fieldErrors.installmentCount}
          onChange={(event) => form.patch({ installmentCount: event.target.value })}
        />
      ) : null}
      <label className="planning-check">
        <input
          type="checkbox"
          checked={form.values.includedInSimulation}
          onChange={(event) => form.patch({ includedInSimulation: event.target.checked })}
        />
        Incluir este gasto na simulação
      </label>
    </FormDrawer>
  )
}
