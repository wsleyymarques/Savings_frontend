import { useState } from 'react'
import { useDrawerForm } from '../shared/useDrawerForm'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField, MoneyField, SelectField, TextField } from '../../components/ui/Field'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { Button } from '../../components/ui/Button'
import { InlineAlert } from '../../components/ui/States'
import { useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import {
  useCardsQuery,
  useCategoryMutation,
  useExpenseMutation,
  useExpenseQuery,
  useSelectableCategoriesQuery,
} from '../../services/queries'
import { fieldsFor, type CardSummary, type ExpenseInput } from '../../services'
import { useToast } from '../../components/ui/toastContext'
import { formatAmountInput, formatMoney, parseMoney } from '../../lib/money'
import { addMonths, formatDate } from '../../lib/date'
import { today } from '../../lib/today'
import { resolveInvoiceCycle } from '../../data/selectors'
import { PAYMENT_METHOD_LABEL, type ExpenseMode, type Id, type PaymentMethod } from '../../data/types'
import { DrawerRecord } from '../shared/DrawerFallback'

interface ExpenseFormProps {
  expenseId?: Id
  recurringRule?: boolean
  onClose: () => void
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: PAYMENT_METHOD_LABEL.pix },
  { value: 'boleto', label: PAYMENT_METHOD_LABEL.boleto },
  { value: 'debito', label: PAYMENT_METHOD_LABEL.debito },
  { value: 'credito', label: PAYMENT_METHOD_LABEL.credito },
]

const EXPENSE_MODE_OPTIONS: { value: ExpenseMode; label: string; hint: string }[] = [
  { value: 'unica', label: 'À vista', hint: 'uma cobrança' },
  { value: 'parcelada', label: 'Parcelada', hint: '2 a 48 parcelas' },
  { value: 'recorrente', label: 'Recorrente', hint: 'cobrança mensal' },
]

export function ExpenseForm({ expenseId, recurringRule = false, onClose }: ExpenseFormProps) {
  const { accountId } = useScope()
  const { accounts } = useAccountScope()
  const query = useExpenseQuery(expenseId, recurringRule)

  if (!expenseId) {
    return (
      <ExpenseFields
        title="Novo gasto"
        initial={{
          description: '',
          amount: 0,
          date: today(),
          method: 'pix',
          accountId: accountId ?? accounts[0]?.id ?? null,
          cardId: null,
          categoryId: null,
          expenseMode: 'unica',
          installmentCount: 2,
          recurrenceEndDate: null,
        }}
        onClose={onClose}
      />
    )
  }

  return (
    <DrawerRecord title={recurringRule ? 'Editar recorrência' : 'Editar gasto'} query={query} onClose={onClose}>
      {(data) => (
        <ExpenseFields
          title={recurringRule ? 'Editar recorrência' : 'Editar gasto'}
          expenseId={expenseId}
          recurringRule={recurringRule}
          initial={data}
          onClose={onClose}
        />
      )}
    </DrawerRecord>
  )
}

interface ExpenseFieldsProps {
  title: string
  expenseId?: Id
  recurringRule?: boolean
  initial: ExpenseInput
  onClose: () => void
}

function ExpenseFields({ title, expenseId, recurringRule = false, initial, onClose }: ExpenseFieldsProps) {
  const { status } = useSession()
  const { accounts } = useAccountScope()
  const toast = useToast()
  const expenseMutation = useExpenseMutation(expenseId, recurringRule)
  const categoryMutation = useCategoryMutation()

  const cardsQuery = useCardsQuery({ accountId: null }, status === 'authenticated')
  const cards: CardSummary[] = cardsQuery.data?.items ?? []

  const form = useDrawerForm({
    description: initial.description,
    amount: initial.amount > 0 ? formatAmountInput(initial.amount) : '',
    date: initial.date,
    method: initial.method,
    accountId: initial.accountId ?? '',
    cardId: initial.cardId ?? '',
    categoryId: initial.categoryId ?? '',
    expenseMode: initial.expenseMode ?? 'unica',
    installmentCount: String(initial.installmentCount ?? 2),
    recurrenceMonths: recurrenceDuration(initial.date, initial.recurrenceEndDate),
  })

  const [step, setStep] = useState<'gasto' | 'categoria'>('gasto')
  const [categoryName, setCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null)

  const usesCard = form.values.method === 'debito' || form.values.method === 'credito'
  const selectedCard = cards.find((card) => card.id === form.values.cardId)
  const effectiveAccountId = usesCard ? (selectedCard?.accountId ?? '') : form.values.accountId

  const categoriesQuery = useSelectableCategoriesQuery({ accountId: effectiveAccountId || null })
  const categories = categoriesQuery.data ?? []

  const eligibleCards = cards.filter((card) =>
    form.values.method === 'debito' ? card.functions !== 'credito' : card.functions !== 'debito',
  )

  /** Ao trocar o vínculo, limpa apenas a categoria incompatível e explica o motivo. */
  function revalidateCategory(nextAccountId: string) {
    const current = categories.find((category) => category.id === form.values.categoryId)
    if (!form.values.categoryId || !current) {
      setCategoryNotice(null)
      return
    }
    const stillValid = current.origin === 'padrao' || current.accountId === nextAccountId
    if (!stillValid) {
      form.patch({ categoryId: '' })
      setCategoryNotice(
        `A categoria "${current.name}" pertence a outra conta. Selecione uma categoria disponível.`,
      )
    } else {
      setCategoryNotice(null)
    }
  }

  function handleMethodChange(method: PaymentMethod) {
    const nextUsesCard = method === 'debito' || method === 'credito'
    const card = cards.find((item) => item.id === form.values.cardId)
    const stillValid =
      card && (method === 'debito' ? card.functions !== 'credito' : card.functions !== 'debito')
    const nextCardId = nextUsesCard && stillValid ? form.values.cardId : ''
    const nextAccountId = nextUsesCard
      ? stillValid
        ? (card?.accountId ?? '')
        : ''
      : form.values.accountId || (accounts[0]?.id ?? '')

    form.patch({
      method,
      cardId: nextCardId,
      accountId: nextAccountId,
      expenseMode: method === 'credito' ? form.values.expenseMode : 'unica',
    })
    revalidateCategory(nextAccountId)
  }

  function handleCardChange(cardId: string) {
    const card = cards.find((item) => item.id === cardId)
    form.patch({ cardId, accountId: card?.accountId ?? '' })
    revalidateCategory(card?.accountId ?? '')
  }

  function handleAccountChange(nextAccountId: string) {
    form.patch({ accountId: nextAccountId })
    revalidateCategory(nextAccountId)
  }

  async function handleSubmitExpense() {
    const parsed = parseMoney(form.values.amount)
    if (!parsed.ok) {
      form.setFieldErrors({ amount: parsed.reason })
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.drawer .money-input')?.focus()
      })
      return
    }

    const ok = await form.submit(() =>
      expenseMutation.mutateAsync({
        description: form.values.description,
        amount: parsed.cents,
        date: form.values.date,
        method: form.values.method,
        accountId: usesCard ? null : form.values.accountId || null,
        cardId: usesCard ? form.values.cardId || null : null,
        categoryId: form.values.categoryId || null,
        expenseMode: form.values.method === 'credito' ? form.values.expenseMode : 'unica',
        installmentCount: Number(form.values.installmentCount),
        recurrenceEndDate:
          form.values.expenseMode === 'recorrente' && Number(form.values.recurrenceMonths) > 0
            ? addMonths(form.values.date, Number(form.values.recurrenceMonths) - 1)
            : null,
      }),
    )

    if (ok) {
      toast.notify(recurringRule ? 'Recorrência atualizada' : expenseId ? 'Despesa atualizada' : 'Despesa registrada')
      onClose()
    }
  }

  /** Etapa interna: cria a categoria e volta ao gasto com ela selecionada. */
  async function handleSubmitCategory() {
    setCategoryError(null)
    try {
      // Criada aqui, a categoria vale em todas as contas: é o alcance que não
      // deixa o gasto seguinte ficar sem ela por causa do cartão escolhido.
      const category = await categoryMutation.mutateAsync({
        name: categoryName,
        accountId: null,
      })
      form.patch({ categoryId: category.id })
      setCategoryName('')
      setCategoryNotice(null)
      setStep('gasto')
      toast.notify('Categoria criada')
    } catch (error) {
      const fields = fieldsFor(error)
      setCategoryError(fields.name ?? fields.accountId ?? 'Não foi possível criar a categoria.')
    }
  }

  const invoicePreview =
    form.values.method === 'credito' && selectedCard?.closingDay
      ? resolveInvoiceCycle(selectedCard, form.values.date)
      : null

  const parsedPreviewAmount = parseMoney(form.values.amount)
  const installmentCount = Number(form.values.installmentCount)
  const installmentBase = parsedPreviewAmount.ok && installmentCount > 0
    ? Math.floor(parsedPreviewAmount.cents / installmentCount)
    : 0
  const installmentLast = parsedPreviewAmount.ok
    ? parsedPreviewAmount.cents - installmentBase * Math.max(0, installmentCount - 1)
    : 0

  const inCategoryStep = step === 'categoria'

  return (
    <FormDrawer
      title={inCategoryStep ? 'Nova categoria' : title}
      submitLabel={inCategoryStep ? 'Salvar categoria' : 'Salvar'}
      dirty={form.dirty || categoryName.trim().length > 0}
      submitting={form.submitting || categoryMutation.isPending}
      error={inCategoryStep ? null : form.formError}
      onSubmit={inCategoryStep ? handleSubmitCategory : handleSubmitExpense}
      onClose={onClose}
      onBack={inCategoryStep ? () => setStep('gasto') : undefined}
    >
      <div className="drawer-step" hidden={inCategoryStep}>
        <TextField
          label="Descrição"
          value={form.values.description}
          maxLength={120}
          error={form.fieldErrors.description}
          placeholder="Mercado, combustível, assinatura"
          onChange={(event) => form.patch({ description: event.target.value })}
        />
        <MoneyField
          label={form.values.expenseMode === 'parcelada' ? 'Valor total da compra' : 'Valor'}
          value={form.values.amount}
          error={form.fieldErrors.amount}
          onChange={(amount) => form.patch({ amount })}
        />
        <DateField
          label={
            form.values.expenseMode === 'recorrente'
              ? 'Primeira cobrança'
              : form.values.method === 'credito'
                ? 'Data da compra'
                : 'Data do pagamento'
          }
          value={form.values.date}
          error={form.fieldErrors.date}
          hint={
            form.values.method === 'credito'
              ? 'Compras no crédito entram nos gastos pela data da compra.'
              : 'Registre um pagamento já realizado.'
          }
          onChange={(date) => form.patch({ date })}
        />

        {recurringRule ? (
          <InlineAlert tone="info" title="Recorrência mensal">
            A edição altera esta e as próximas previsões. Cobranças já realizadas são preservadas.
          </InlineAlert>
        ) : (
          <RadioGroup
            legend="Forma de pagamento"
            name="forma-pagamento"
            value={form.values.method}
            options={METHOD_OPTIONS}
            inline
            onChange={handleMethodChange}
          />
        )}

        {form.values.method === 'credito' && !recurringRule ? (
          <RadioGroup
            legend="Tipo da despesa"
            name="tipo-despesa"
            value={form.values.expenseMode}
            options={EXPENSE_MODE_OPTIONS}
            onChange={(expenseMode) => form.patch({ expenseMode })}
          />
        ) : null}

        {form.values.method === 'credito' && form.values.expenseMode === 'parcelada' ? (
          <SelectField
            label="Quantidade de parcelas"
            value={form.values.installmentCount}
            hint="O valor total compromete o limite imediatamente."
            onChange={(event) => form.patch({ installmentCount: event.target.value })}
          >
            {Array.from({ length: 47 }, (_, index) => index + 2).map((count) => (
              <option key={count} value={count}>{count}x</option>
            ))}
          </SelectField>
        ) : null}

        {form.values.method === 'credito' && form.values.expenseMode === 'recorrente' ? (
          <SelectField
            label="Duração"
            value={form.values.recurrenceMonths}
            hint="Cada cobrança compromete o limite somente quando for gerada."
            onChange={(event) => form.patch({ recurrenceMonths: event.target.value })}
          >
            <option value="0">Sem data para terminar</option>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
            <option value="24">24 meses</option>
          </SelectField>
        ) : null}

        {usesCard ? (
          <SelectField
            label="Cartão"
            value={form.values.cardId}
            placeholder="Selecione o cartão"
            error={form.fieldErrors.cardId}
            hint={
              selectedCard
                ? `Conta vinculada: ${selectedCard.accountName}`
                : 'Somente cartões com a função selecionada aparecem aqui.'
            }
            onChange={(event) => handleCardChange(event.target.value)}
          >
            {eligibleCards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </SelectField>
        ) : (
          <SelectField
            label="Conta de origem"
            value={form.values.accountId}
            placeholder="Selecione a conta"
            error={form.fieldErrors.accountId}
            hint="O valor sai do saldo desta conta."
            onChange={(event) => handleAccountChange(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>
        )}

        {form.values.method === 'credito' && selectedCard ? (
          <InlineAlert tone="info" title="Compra no crédito">
            <p>
              {form.values.expenseMode === 'parcelada'
                ? 'O total da compra compromete o limite agora; cada parcela entra em uma fatura mensal.'
                : form.values.expenseMode === 'recorrente'
                  ? 'A cobrança será repetida mensalmente e comprometerá o limite quando cada ocorrência for gerada.'
                  : 'O valor entra na fatura e compromete o limite; o saldo da conta não muda agora.'}
            </p>
            <dl className="drawer__summary" style={{ marginTop: 'var(--space-2)' }}>
              <div className="drawer__summary-row">
                <dt>Limite disponível</dt>
                <dd>{formatMoney(selectedCard.available)}</dd>
              </div>
              {form.values.expenseMode === 'parcelada' && parsedPreviewAmount.ok ? (
                <div className="drawer__summary-row">
                  <dt>Parcelas previstas</dt>
                  <dd>
                    {installmentCount - 1}x {formatMoney(installmentBase)} + 1x {formatMoney(installmentLast)}
                  </dd>
                </div>
              ) : null}
              {invoicePreview ? (
                <>
                  <div className="drawer__summary-row">
                    <dt>Fatura prevista</dt>
                    <dd>{invoicePreview.cycleLabel}</dd>
                  </div>
                  <div className="drawer__summary-row">
                    <dt>Vencimento</dt>
                    <dd>{formatDate(invoicePreview.dueDate)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </InlineAlert>
        ) : null}

        {categoryNotice ? <InlineAlert tone="warning">{categoryNotice}</InlineAlert> : null}

        <SelectField
          label="Categoria"
          value={form.values.categoryId}
          placeholder="Selecione a categoria"
          error={form.fieldErrors.categoryId}
          hint="Além das padrão, aparecem as suas categorias válidas para esta conta."
          disabled={!effectiveAccountId}
          onChange={(event) => {
            form.patch({ categoryId: event.target.value })
            setCategoryNotice(null)
          }}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.origin === 'personalizada' ? ' (personalizada)' : ''}
            </option>
          ))}
        </SelectField>

        <div>
          <Button
            variant="ghost"
            icon="plus"
            disabled={!effectiveAccountId}
            onClick={() => setStep('categoria')}
          >
            Criar categoria
          </Button>
        </div>
      </div>

      <div className="drawer-step" hidden={!inCategoryStep}>
        <InlineAlert tone="info">
          A categoria ficará disponível em <strong>todas as contas</strong>. Para prendê-la a uma
          conta, use a página Categorias. Seu rascunho do gasto está preservado.
        </InlineAlert>
        <TextField
          label="Nome da categoria"
          value={categoryName}
          maxLength={60}
          error={categoryError ?? undefined}
          placeholder="Equipamentos, Pets, Cursos"
          onChange={(event) => setCategoryName(event.target.value)}
        />
      </div>
    </FormDrawer>
  )
}

function recurrenceDuration(start: string, end: string | null | undefined): string {
  if (!end) return '0'
  const [startYear, startMonth] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  const months = (endYear - startYear) * 12 + endMonth - startMonth + 1
  return ['3', '6', '12', '24'].includes(String(months)) ? String(months) : '0'
}
