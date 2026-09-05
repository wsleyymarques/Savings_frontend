import { useDrawerForm } from '../shared/useDrawerForm'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField, MoneyField, TextField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useAccountScope } from '../../app/useScopeLabel'
import { useAccountMutation } from '../../services/queries'
import { useToast } from '../../components/ui/toastContext'
import { formatAmountInput, parseMoney } from '../../lib/money'
import { today } from '../../lib/today'
import type { Id } from '../../data/types'

interface AccountFormProps {
  accountId?: Id
  onClose: () => void
}

export function AccountForm({ accountId, onClose }: AccountFormProps) {
  const { accounts } = useAccountScope()
  const toast = useToast()
  const mutation = useAccountMutation(accountId)

  const existing = accounts.find((account) => account.id === accountId)
  const form = useDrawerForm({
    name: existing?.name ?? '',
    initialBalance: existing ? formatAmountInput(existing.initialBalance) : '',
    referenceDate: existing?.referenceDate ?? today(),
  })

  async function handleSubmit() {
    const parsed = parseMoney(form.values.initialBalance || '0')
    if (!accountId && !parsed.ok) {
      form.setFieldErrors({ initialBalance: parsed.reason })
      return
    }

    const ok = await form.submit(() =>
      mutation.mutateAsync({
        name: form.values.name,
        initialBalance: parsed.ok ? parsed.cents : 0,
        referenceDate: form.values.referenceDate,
      }),
    )
    if (ok) {
      toast.notify(accountId ? 'Conta atualizada' : 'Conta criada')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={accountId ? 'Editar conta' : 'Nova conta'}
      submitLabel="Salvar"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        label="Nome da conta"
        value={form.values.name}
        maxLength={60}
        error={form.fieldErrors.name}
        placeholder="Conta Principal"
        onChange={(event) => form.patch({ name: event.target.value })}
      />
      <MoneyField
        label="Saldo inicial"
        value={form.values.initialBalance}
        error={form.fieldErrors.initialBalance}
        readOnly={Boolean(accountId)}
        hint="Dinheiro existente quando você começou a acompanhar esta conta. Não é uma receita do período."
        onChange={(initialBalance) => form.patch({ initialBalance })}
      />
      <DateField
        label="Data de referência do saldo"
        value={form.values.referenceDate}
        error={form.fieldErrors.referenceDate}
        readOnly={Boolean(accountId)}
        onChange={(referenceDate) => form.patch({ referenceDate })}
      />
      {accountId ? (
        <InlineAlert tone="info">
          Saldo inicial e data de referência ficam somente para leitura até que as regras de correção
          financeira sejam definidas no SDD.
        </InlineAlert>
      ) : null}
    </FormDrawer>
  )
}
