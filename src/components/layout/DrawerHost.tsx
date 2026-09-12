import { useDrawer } from '../../app/contexts'
import { IncomeForm } from '../../features/entries/IncomeForm'
import { ExpenseForm } from '../../features/entries/ExpenseForm'
import { AccountForm } from '../../features/accounts/AccountForm'
import { CardForm } from '../../features/cards/CardForm'
import { CategoryForm } from '../../features/categories/CategoryForm'
import { PaymentForm } from '../../features/invoices/PaymentForm'
import { ProfileForm } from '../../features/profile/ProfileForm'
import { WishForm } from '../../features/planning/WishForm'
import { PlannedExpenseForm } from '../../features/planning/PlannedExpenseForm'
import { RealizePlannedExpenseForm } from '../../features/planning/RealizePlannedExpenseForm'
import { PersonalCommitmentForm } from '../../features/entries/PersonalCommitmentForm'
import { RegisterCommitmentPaymentForm } from '../../features/entries/RegisterCommitmentPaymentForm'
import { GoalCycleForm } from '../../features/goals/GoalCycleForm'
import { GoalObjectiveForm } from '../../features/goals/GoalObjectiveForm'
import { GoalProgressForm } from '../../features/goals/GoalProgressForm'

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
      return (
        <ExpenseForm
          key={`gasto-${request.recurringRule ? 'recorrencia-' : ''}${request.id ?? 'novo'}`}
          expenseId={request.id}
          recurringRule={request.recurringRule}
          onClose={close}
        />
      )
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
    case 'desejo':
      return <WishForm key={`desejo-${request.id ?? 'novo'}`} wishId={request.id} onClose={close} />
    case 'gasto-planejado':
      return (
        <PlannedExpenseForm
          key={`gasto-planejado-${request.id ?? request.wishId ?? 'novo'}`}
          plannedExpenseId={request.id}
          wishId={request.wishId}
          onClose={close}
        />
      )
    case 'realizar-gasto':
      return <RealizePlannedExpenseForm key={`realizar-${request.id}`} id={request.id} onClose={close} />
    case 'compromisso':
      return <PersonalCommitmentForm key={`compromisso-${request.id ?? 'novo'}`} id={request.id} onClose={close} />
    case 'ciclo-meta':
      return <GoalCycleForm key={`ciclo-meta-${request.id ?? 'novo'}`} cycleId={request.id} onClose={close} />
    case 'objetivo-meta':
      return (
        <GoalObjectiveForm
          key={`objetivo-meta-${request.id ?? 'novo'}`}
          cycleId={request.cycleId}
          objectiveId={request.id}
          onClose={close}
        />
      )
    case 'progresso-meta':
      return (
        <GoalProgressForm
          key={`progresso-meta-${request.objectiveId}`}
          objectiveId={request.objectiveId}
          onClose={close}
        />
      )
    case 'pagar-compromisso':
      return (
        <RegisterCommitmentPaymentForm
          key={`pagar-${request.id}-${request.occurrence.scheduledDate}`}
          commitmentId={request.id}
          occurrence={request.occurrence}
          onClose={close}
        />
      )
  }
}
