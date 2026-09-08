import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useToast } from '../../components/ui/toastContext'
import { formatMoney } from '../../lib/money'
import { today } from '../../lib/today'
import { usePlannedExpenseQuery, useRealizePlannedExpenseMutation } from '../../services/queries'
import type { Id } from '../../data/types'
import type { PlannedExpense } from '../../services'
import { DrawerRecord } from '../shared/DrawerFallback'
import { useDrawerForm } from '../shared/useDrawerForm'

export function RealizePlannedExpenseForm({ id, onClose }: { id: Id; onClose: () => void }) {
  const query = usePlannedExpenseQuery(id)
  return (
    <DrawerRecord title="Registrar compra" query={query} onClose={onClose}>
      {(item) => <RealizeFields id={id} item={item} onClose={onClose} />}
    </DrawerRecord>
  )
}

function RealizeFields({ id, item, onClose }: { id: Id; item: PlannedExpense; onClose: () => void }) {
  const mutation = useRealizePlannedExpenseMutation(id)
  const toast = useToast()
  const form = useDrawerForm({ purchaseDate: today() })

  async function submit() {
    const ok = await form.submit(() => mutation.mutateAsync({ purchaseDate: form.values.purchaseDate }))
    if (ok) {
      toast.notify('Compra registrada como despesa real')
      onClose()
    }
  }

  return (
    <FormDrawer
      title="Registrar compra"
      submitLabel="Transformar em despesa"
      submittingLabel="Registrando…"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
    >
      <InlineAlert tone="success" title={item.description}>
        {formatMoney(item.amount)} · {item.expenseMode === 'parcelada' ? `${item.installmentCount} parcelas` : 'à vista'}.
        Todos os demais dados serão reaproveitados do planejamento.
      </InlineAlert>
      <DateField
        label="Data da compra"
        value={form.values.purchaseDate}
        onChange={(value) => form.patch({ purchaseDate: value })}
      />
    </FormDrawer>
  )
}
