import { FormDrawer } from '../../components/layout/FormDrawer'
import { DateField, MoneyField, SelectField, TextField } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toastContext'
import { formatAmountInput, parseMoney } from '../../lib/money'
import { useWishMutation, useWishQuery } from '../../services/queries'
import type { WishInput, WishPriority } from '../../services'
import type { Id } from '../../data/types'
import { DrawerRecord } from '../shared/DrawerFallback'
import { useDrawerForm } from '../shared/useDrawerForm'

interface WishFormProps {
  wishId?: Id
  onClose: () => void
}

export function WishForm({ wishId, onClose }: WishFormProps) {
  const query = useWishQuery(wishId)
  if (!wishId) {
    return (
      <WishFields
        initial={{
          description: '',
          estimatedAmount: 0,
          desiredDate: null,
          priority: 'media',
          productUrl: null,
          notes: null,
        }}
        onClose={onClose}
      />
    )
  }

  return (
    <DrawerRecord title="Editar desejo" query={query} onClose={onClose}>
      {(wish) => (
        <WishFields
          wishId={wish.id}
          initial={{
            description: wish.description,
            estimatedAmount: wish.estimatedAmount,
            desiredDate: wish.desiredDate,
            priority: wish.priority,
            productUrl: wish.productUrl,
            notes: wish.notes,
          }}
          onClose={onClose}
        />
      )}
    </DrawerRecord>
  )
}

function WishFields({ wishId, initial, onClose }: { wishId?: Id; initial: WishInput; onClose: () => void }) {
  const mutation = useWishMutation(wishId)
  const toast = useToast()
  const form = useDrawerForm({
    description: initial.description,
    estimatedAmount: initial.estimatedAmount ? formatAmountInput(initial.estimatedAmount) : '',
    desiredDate: initial.desiredDate ?? '',
    priority: initial.priority,
    productUrl: initial.productUrl ?? '',
    notes: initial.notes ?? '',
  })

  async function submit() {
    const amount = parseMoney(form.values.estimatedAmount)
    const errors: Record<string, string> = {}
    if (!form.values.description.trim()) errors.description = 'Informe o produto ou desejo.'
    if (!amount.ok) errors.estimatedAmount = amount.reason
    if (Object.keys(errors).length) {
      form.setFieldErrors(errors)
      return
    }

    const ok = await form.submit(() =>
      mutation.mutateAsync({
        description: form.values.description,
        estimatedAmount: amount.ok ? amount.cents : 0,
        desiredDate: form.values.desiredDate || null,
        priority: form.values.priority,
        productUrl: form.values.productUrl.trim() || null,
        notes: form.values.notes.trim() || null,
      }),
    )
    if (ok) {
      toast.notify(wishId ? 'Desejo atualizado' : 'Desejo adicionado')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={wishId ? 'Editar desejo' : 'Novo desejo'}
      submitLabel={wishId ? 'Salvar' : 'Adicionar desejo'}
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label="Produto ou desejo"
        value={form.values.description}
        error={form.fieldErrors.description}
        maxLength={140}
        onChange={(event) => form.patch({ description: event.target.value })}
      />
      <MoneyField
        label="Valor estimado"
        value={form.values.estimatedAmount}
        error={form.fieldErrors.estimatedAmount}
        onChange={(value) => form.patch({ estimatedAmount: value })}
      />
      <DateField
        label="Data desejada (opcional)"
        value={form.values.desiredDate}
        onChange={(value) => form.patch({ desiredDate: value })}
      />
      <SelectField
        label="Prioridade"
        value={form.values.priority}
        onChange={(event) => form.patch({ priority: event.target.value as WishPriority })}
      >
        <option value="baixa">Baixa</option>
        <option value="media">Média</option>
        <option value="alta">Alta</option>
      </SelectField>
      <TextField
        label="Link do produto (opcional)"
        type="url"
        value={form.values.productUrl}
        placeholder="https://"
        maxLength={2048}
        onChange={(event) => form.patch({ productUrl: event.target.value })}
      />
      <TextField
        label="Observações (opcional)"
        value={form.values.notes}
        maxLength={1000}
        onChange={(event) => form.patch({ notes: event.target.value })}
      />
    </FormDrawer>
  )
}
