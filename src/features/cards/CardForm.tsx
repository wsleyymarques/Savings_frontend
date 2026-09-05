import { useDrawerForm } from '../shared/useDrawerForm'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { MoneyField, SelectField, TextField } from '../../components/ui/Field'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { ColorPicker } from '../../components/ui/ColorPicker'
import { InlineAlert } from '../../components/ui/States'
import { useScope, useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useCardMutation, useCardsQuery } from '../../services/queries'
import { useToast } from '../../components/ui/toastContext'
import { formatAmountInput, parseMoney } from '../../lib/money'
import { CARD_FUNCTION_LABEL, type CardFunction, type Id } from '../../data/types'
import { CardVisual } from './CardVisual'

interface CardFormProps {
  cardId?: Id
  onClose: () => void
}

const FUNCTION_OPTIONS: { value: CardFunction; label: string }[] = [
  { value: 'credito', label: CARD_FUNCTION_LABEL.credito },
  { value: 'debito', label: CARD_FUNCTION_LABEL.debito },
  { value: 'ambas', label: CARD_FUNCTION_LABEL.ambas },
]

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

export function CardForm({ cardId, onClose }: CardFormProps) {
  const { accountId } = useScope()
  const { status } = useSession()
  const { accounts } = useAccountScope()
  const toast = useToast()
  const mutation = useCardMutation(cardId)

  const cardsQuery = useCardsQuery({ accountId: null }, status === 'authenticated')
  const existing = cardsQuery.data?.items.find((card) => card.id === cardId)

  const form = useDrawerForm({
    name: existing?.name ?? '',
    accountId: existing?.accountId ?? accountId ?? accounts[0]?.id ?? '',
    functions: (existing?.functions ?? 'credito') as CardFunction,
    color: existing?.color ?? '#047857',
    creditLimit: existing?.creditLimit ? formatAmountInput(existing.creditLimit) : '',
    closingDay: existing?.closingDay ? String(existing.closingDay) : '8',
    dueDay: existing?.dueDay ? String(existing.dueDay) : '15',
  })

  const hasCredit = form.values.functions === 'credito' || form.values.functions === 'ambas'
  const accountName = accounts.find((account) => account.id === form.values.accountId)?.name

  async function handleSubmit() {
    let limit: number | null = null
    if (hasCredit) {
      const parsed = parseMoney(form.values.creditLimit)
      if (!parsed.ok) {
        form.setFieldErrors({ creditLimit: parsed.reason })
        return
      }
      limit = parsed.cents
    }

    const ok = await form.submit(() =>
      mutation.mutateAsync({
        name: form.values.name,
        accountId: form.values.accountId || null,
        functions: form.values.functions,
        color: form.values.color,
        creditLimit: limit,
        closingDay: hasCredit ? Number(form.values.closingDay) : null,
        dueDay: hasCredit ? Number(form.values.dueDay) : null,
      }),
    )
    if (ok) {
      toast.notify(cardId ? 'Cartão atualizado' : 'Cartão criado')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={cardId ? 'Editar cartão' : 'Novo cartão'}
      submitLabel="Salvar"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        label="Nome do cartão"
        value={form.values.name}
        maxLength={60}
        error={form.fieldErrors.name}
        placeholder="Cartão Principal"
        onChange={(event) => form.patch({ name: event.target.value })}
      />

      <SelectField
        label="Conta vinculada"
        value={form.values.accountId}
        placeholder="Selecione a conta"
        error={form.fieldErrors.accountId}
        hint="Define as categorias disponíveis e, no débito, a conta de origem do dinheiro."
        onChange={(event) => form.patch({ accountId: event.target.value })}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </SelectField>

      <RadioGroup
        legend="Funções habilitadas"
        name="funcoes-cartao"
        value={form.values.functions}
        options={FUNCTION_OPTIONS}
        inline
        onChange={(functions) => form.patch({ functions })}
      />

      <ColorPicker value={form.values.color} onChange={(color) => form.patch({ color })} />

      <div>
        <p className="field__label" style={{ marginBottom: 'var(--space-2)' }}>
          Prévia
        </p>
        <CardVisual
          name={form.values.name || 'Nome do cartão'}
          accountName={accountName ?? 'Conta vinculada'}
          functions={form.values.functions}
          color={form.values.color}
        />
      </div>

      {hasCredit ? (
        <>
          <MoneyField
            label="Limite total de crédito"
            value={form.values.creditLimit}
            error={form.fieldErrors.creditLimit}
            onChange={(creditLimit) => form.patch({ creditLimit })}
          />
          <SelectField
            label="Dia de fechamento da fatura"
            value={form.values.closingDay}
            error={form.fieldErrors.closingDay}
            onChange={(event) => form.patch({ closingDay: event.target.value })}
          >
            {DAYS.map((day) => (
              <option key={day} value={day}>
                Dia {day}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Dia de vencimento da fatura"
            value={form.values.dueDay}
            error={form.fieldErrors.dueDay}
            hint="O fechamento encerra o ciclo de compras; o vencimento é a data de pagamento."
            onChange={(event) => form.patch({ dueDay: event.target.value })}
          >
            {DAYS.map((day) => (
              <option key={day} value={day}>
                Dia {day}
              </option>
            ))}
          </SelectField>
        </>
      ) : (
        <InlineAlert tone="info">
          Cartões somente de débito usam o saldo da conta vinculada. Não há limite de crédito nem fatura.
        </InlineAlert>
      )}

      {cardId ? (
        <InlineAlert tone="warning">
          Alterações de limite e datas valem para os próximos cálculos. As regras de correção
          retroativa continuam pendentes no SDD.
        </InlineAlert>
      ) : null}
    </FormDrawer>
  )
}
