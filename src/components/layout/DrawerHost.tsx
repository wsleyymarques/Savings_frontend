import { useDrawer } from '../../app/contexts'
import { IncomeForm } from '../../features/entries/IncomeForm'
import { ExpenseForm } from '../../features/entries/ExpenseForm'
import { AccountForm } from '../../features/accounts/AccountForm'
import { CardForm } from '../../features/cards/CardForm'
import { CategoryForm } from '../../features/categories/CategoryForm'
import { PaymentForm } from '../../features/invoices/PaymentForm'
import { ProfileForm } from '../../features/profile/ProfileForm'

/**
 * Um único painel lateral para toda criação/edição (REQ-18).
 * A chave por requisição garante rascunho limpo a cada abertura.
 */
export function DrawerHost() {
  const { request, close } = useDrawer()
  if (!request) return null

  switch (request.kind) {
    case 'receita':
      return <IncomeForm key={`receita-${request.id ?? 'nova'}`} incomeId={request.id} onClose={close} />
    case 'gasto':
      return <ExpenseForm key={`gasto-${request.id ?? 'novo'}`} expenseId={request.id} onClose={close} />
    case 'conta':
      return <AccountForm key={`conta-${request.id ?? 'nova'}`} accountId={request.id} onClose={close} />
    case 'cartao':
      return <CardForm key={`cartao-${request.id ?? 'novo'}`} cardId={request.id} onClose={close} />
    case 'categoria':
      return (
        <CategoryForm
          key={`categoria-${request.id ?? 'nova'}`}
          categoryId={request.id}
          accountId={request.accountId}
          onClose={close}
        />
      )
    case 'pagamento':
      return <PaymentForm key={`pagamento-${request.invoiceId}`} invoiceId={request.invoiceId} onClose={close} />
    case 'perfil':
      return <ProfileForm key="perfil" onClose={close} />
  }
}
