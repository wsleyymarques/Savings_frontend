import { useDrawerForm } from '../shared/useDrawerForm'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { SelectField, TextField, MoneyField, DateField } from '../../components/ui/Field'
import { useScope } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useIncomeMutation, useIncomeQuery } from '../../services/queries'
import { useToast } from '../../components/ui/toastContext'
import { formatAmountInput, parseMoney } from '../../lib/money'
import { today } from '../../lib/today'
import { DrawerRecord } from '../shared/DrawerFallback'
import type { IncomeInput } from '../../services'
import type { Id } from '../../data/types'

interface IncomeFormProps {
  incomeId?: Id
  onClose: () => void
}

export function IncomeForm({ incomeId, onClose }: IncomeFormProps) {
  const { accountId } = useScope()
  const { accounts } = useAccountScope()
  const query = useIncomeQuery(incomeId)

  if (!incomeId) {
    return (
      <IncomeFields
        title="Nova receita"
        initial={{
          description: '',
          amount: 0,
          accountId: accountId ?? accounts[0]?.id ?? null,
          date: today(),
        }}
        onClose={onClose}
      />
    )
  }

  return (
    <DrawerRecord title="Editar receita" query={query} onClose={onClose}>
      {(data) => (
        <IncomeFields title="Editar receita" incomeId={incomeId} initial={data} onClose={onClose} />
      )}
    </DrawerRecord>
  )
}

interface IncomeFieldsProps {
  title: string
  incomeId?: Id
  initial: IncomeInput
  onClose: () => void
}

function IncomeFields({ title, incomeId, initial, onClose }: IncomeFieldsProps) {
  const { accounts } = useAccountScope()
  const toast = useToast()
  const mutation = useIncomeMutation(incomeId)

  const form = useDrawerForm({
    description: initial.description,
    amount: initial.amount > 0 ? formatAmountInput(initial.amount) : '',
    accountId: initial.accountId ?? '',
    date: initial.date,
  })

  async function handleSubmit() {
    const parsed = parseMoney(form.values.amount)
    if (!parsed.ok) {
      form.setFieldErrors({ amount: parsed.reason })
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.drawer .money-input')?.focus()
      })
      return
    }

    const ok = await form.submit(() =>
      mutation.mutateAsync({
        description: form.values.description,
        amount: parsed.cents,
        accountId: form.values.accountId || null,
        date: form.values.date,
      }),
    )

    if (ok) {
      toast.notify(incomeId ? 'Receita atualizada' : 'Receita registrada')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={title}
      submitLabel="Salvar"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        label="Descrição"
        value={form.values.description}
        maxLength={120}
        error={form.fieldErrors.description}
        placeholder="Salário, freelance, reembolso"
        onChange={(event) => form.patch({ description: event.target.value })}
      />
      <MoneyField
        label="Valor recebido"
        value={form.values.amount}
        error={form.fieldErrors.amount}
        onChange={(amount) => form.patch({ amount })}
      />
      <SelectField
        label="Conta de destino"
        value={form.values.accountId}
        placeholder="Selecione a conta"
        error={form.fieldErrors.accountId}
        hint="O valor recebido aumenta o saldo desta conta."
        onChange={(event) => form.patch({ accountId: event.target.value })}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </SelectField>
      <DateField
        label="Data do recebimento"
        value={form.values.date}
        error={form.fieldErrors.date}
        onChange={(date) => form.patch({ date })}
      />
    </FormDrawer>
  )
}
