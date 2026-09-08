import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useToast } from '../../components/ui/toastContext'
import type { Id } from '../../data/types'
import { formatMoney } from '../../lib/money'
import { today } from '../../lib/today'
import type { CommitmentOccurrence } from '../../services'
import { useRegisterCommitmentPaymentMutation } from '../../services/queries'
import { useDrawerForm } from '../shared/useDrawerForm'

export function RegisterCommitmentPaymentForm({
  commitmentId,
  occurrence,
  onClose,
}: {
  commitmentId: Id
  occurrence: CommitmentOccurrence
  onClose: () => void
}) {
  const mutation = useRegisterCommitmentPaymentMutation(commitmentId, occurrence.scheduledDate)
  const toast = useToast()
  const form = useDrawerForm({ paymentDate: today() })

  async function submit() {
    const ok = await form.submit(() => mutation.mutateAsync({ paymentDate: form.values.paymentDate }))
    if (ok) {
      toast.notify('Pagamento registrado como despesa real')
      onClose()
    }
  }

  return (
    <FormDrawer
      title="Registrar pagamento"
      submitLabel="Confirmar pagamento"
      submittingLabel="Registrando…"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
    >
      <InlineAlert tone="success" title={occurrence.beneficiaryName}>
        {occurrence.description} · {formatMoney(occurrence.amount)}. Os demais dados serão reaproveitados do compromisso.
      </InlineAlert>
      <DateField
        label="Data do pagamento"
        value={form.values.paymentDate}
        onChange={(value) => form.patch({ paymentDate: value })}
      />
    </FormDrawer>
  )
}
