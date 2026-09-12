import { useDrawerForm } from '../shared/useDrawerForm'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField, MoneyField, SelectField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useScope } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useInvoicePaymentMutation, useInvoiceQuery } from '../../services/queries'
import { useToast } from '../../components/ui/toastContext'
import { formatAmountInput, formatMoney, parseMoney } from '../../lib/money'
import { formatDate } from '../../lib/date'
import { today } from '../../lib/today'
import { DrawerRecord } from '../shared/DrawerFallback'
import type { InvoiceDetail } from '../../services'
import type { Id } from '../../data/types'

interface PaymentFormProps {
  invoiceId: Id
  onClose: () => void
}

export function PaymentForm({ invoiceId, onClose }: PaymentFormProps) {
  const query = useInvoiceQuery(invoiceId)
  return (
    <DrawerRecord title="Registrar pagamento" query={query} onClose={onClose}>
      {(invoice) => <PaymentFields invoice={invoice} onClose={onClose} />}
    </DrawerRecord>
  )
}

function PaymentFields({ invoice, onClose }: { invoice: InvoiceDetail; onClose: () => void }) {
  const { accountId } = useScope()
  const { accounts } = useAccountScope()
  const toast = useToast()
  const mutation = useInvoicePaymentMutation()

  const form = useDrawerForm({
    accountId: accountId ?? accounts[0]?.id ?? '',
    date: today(),
    amount: formatAmountInput(invoice.remaining),
  })

  const source = accounts.find((account) => account.id === form.values.accountId)
  const sourceBalance = source?.currentBalance ?? 0
  const parsedAmount = parseMoney(form.values.amount)
  const amount = parsedAmount.ok ? parsedAmount.cents : invoice.remaining
  const partial = amount > 0 && amount < invoice.remaining

  async function handleSubmit() {
    const errors: Record<string, string> = {}
    if (!parsedAmount.ok) errors.amount = parsedAmount.reason
    else if (parsedAmount.cents <= 0) errors.amount = 'Informe um valor maior que zero.'
    else if (parsedAmount.cents > invoice.remaining) {
      errors.amount = `O valor não pode passar de ${formatMoney(invoice.remaining)}.`
    }
    if (Object.keys(errors).length > 0) {
      form.setFieldErrors(errors)
      return
    }

    const ok = await form.submit(() =>
      mutation.mutateAsync({
        invoiceId: invoice.id,
        accountId: form.values.accountId || null,
        date: form.values.date,
        amount,
      }),
    )
    if (ok) {
      toast.notify(partial ? 'Pagamento parcial registrado' : 'Pagamento registrado')
      onClose()
    }
  }

  return (
    <FormDrawer
      title="Registrar pagamento"
      submitLabel="Registrar pagamento"
      submittingLabel="Registrando…"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={handleSubmit}
      onClose={onClose}
      submitDisabled={!invoice.payable}
    >
      <InlineAlert tone="info">
        Registre um pagamento que você já realizou. A aplicação não executa pagamentos bancários.
      </InlineAlert>

      <dl className="drawer__summary">
        <div className="drawer__summary-row">
          <dt>Cartão</dt>
          <dd>{invoice.cardName}</dd>
        </div>
        <div className="drawer__summary-row">
          <dt>Ciclo</dt>
          <dd>{invoice.cycleLabel}</dd>
        </div>
        <div className="drawer__summary-row">
          <dt>Vencimento</dt>
          <dd>{formatDate(invoice.dueDate)}</dd>
        </div>
      </dl>

      {invoice.payable ? null : (
        <InlineAlert tone="warning">
          Esta fatura não tem valor restante para registrar.
        </InlineAlert>
      )}

      {invoice.cycle === 'aberta' ? (
        <InlineAlert tone="info">
          O ciclo fecha em {formatDate(invoice.closingDate)}. Você está antecipando o pagamento:
          compras novas deste ciclo voltam a somar na mesma fatura.
        </InlineAlert>
      ) : null}

      <MoneyField
        label="Valor do pagamento"
        value={form.values.amount}
        error={form.fieldErrors.amount}
        hint={`Restante da fatura: ${formatMoney(invoice.remaining)}. Um valor menor registra pagamento parcial.`}
        onChange={(value) => form.patch({ amount: value })}
      />

      <SelectField
        label="Conta de origem"
        value={form.values.accountId}
        placeholder="Selecione a conta"
        error={form.fieldErrors.accountId}
        onChange={(event) => form.patch({ accountId: event.target.value })}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </SelectField>

      <DateField
        label="Data do pagamento"
        value={form.values.date}
        error={form.fieldErrors.date}
        onChange={(date) => form.patch({ date })}
      />

      <dl className="drawer__summary">
        <p className="caption text-muted">Impacto do registro</p>
        <div className="drawer__summary-row">
          <dt>Saldo da conta escolhida</dt>
          <dd>
            {formatMoney(sourceBalance)} → {formatMoney(sourceBalance - amount)}
          </dd>
        </div>
        <div className="drawer__summary-row">
          <dt>Limite do cartão liberado</dt>
          <dd>{formatMoney(amount)}</dd>
        </div>
        {partial ? (
          <div className="drawer__summary-row">
            <dt>Restante após o pagamento</dt>
            <dd>{formatMoney(invoice.remaining - amount)}</dd>
          </div>
        ) : null}
        <p className="caption text-muted">
          A quitação não cria uma nova despesa: as compras já foram contabilizadas.
        </p>
      </dl>
    </FormDrawer>
  )
}
