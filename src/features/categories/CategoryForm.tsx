import { useDrawerForm } from '../shared/useDrawerForm'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { SelectField, TextField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useSession } from '../../app/contexts'
import { useAccountScope } from '../../app/useScopeLabel'
import { useCategoriesQuery, useCategoryMutation } from '../../services/queries'
import { useToast } from '../../components/ui/toastContext'
import type { Id } from '../../data/types'

interface CategoryFormProps {
  categoryId?: Id
  accountId?: Id
  onClose: () => void
}

export function CategoryForm({ categoryId, accountId, onClose }: CategoryFormProps) {
  const { status } = useSession()
  const { accounts } = useAccountScope()
  const toast = useToast()
  const mutation = useCategoryMutation(categoryId)

  const categories = useCategoriesQuery({ accountId: null }, status === 'authenticated')
  const existing = categories.data?.find((category) => category.id === categoryId)

  // Vazio significa "todas as contas", o alcance padrão de uma categoria nova.
  const form = useDrawerForm({
    name: existing?.name ?? '',
    accountId: categoryId ? (existing?.accountId ?? '') : (accountId ?? ''),
  })

  async function handleSubmit() {
    const ok = await form.submit(() =>
      mutation.mutateAsync({ name: form.values.name, accountId: form.values.accountId || null }),
    )
    if (ok) {
      toast.notify(categoryId ? 'Categoria renomeada' : 'Categoria criada')
      onClose()
    }
  }

  return (
    <FormDrawer
      title={categoryId ? 'Renomear categoria' : 'Nova categoria'}
      submitLabel="Salvar"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        label="Nome da categoria"
        value={form.values.name}
        maxLength={60}
        error={form.fieldErrors.name}
        placeholder="Equipamentos, Pets, Cursos"
        onChange={(event) => form.patch({ name: event.target.value })}
      />
      <SelectField
        label="Onde a categoria fica disponível"
        value={form.values.accountId}
        placeholder="Todas as contas"
        error={form.fieldErrors.accountId}
        hint={
          form.values.accountId
            ? 'Só aparece nos gastos desta conta e dos cartões ligados a ela.'
            : 'Aparece em qualquer gasto, como as categorias padrão.'
        }
        onChange={(event) => form.patch({ accountId: event.target.value })}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            Apenas {account.name}
          </option>
        ))}
      </SelectField>
      {categoryId ? (
        <InlineAlert tone="info">
          Renomear mantém o histórico: os gastos já registrados passam a mostrar o novo nome.
        </InlineAlert>
      ) : null}
    </FormDrawer>
  )
}
