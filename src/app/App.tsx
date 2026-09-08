import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { RequireSession } from './RequireSession'
import { ProfileRoute } from './ProfileRoute'
import { SignInPage } from '../features/auth/SignInPage'
import { SignUpPage } from '../features/auth/SignUpPage'
import { FirstAccountPage } from '../features/auth/FirstAccountPage'
import { OverviewPage } from '../features/overview/OverviewPage'
import { EntriesPage } from '../features/entries/EntriesPage'
import { AccountsPage } from '../features/accounts/AccountsPage'
import { AccountDetailPage } from '../features/accounts/AccountDetailPage'
import { CardsPage } from '../features/cards/CardsPage'
import { CardDetailPage } from '../features/cards/CardDetailPage'
import { InvoicesPage } from '../features/invoices/InvoicesPage'
import { InvoiceDetailPage } from '../features/invoices/InvoiceDetailPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { PlanningPage } from '../features/planning/PlanningPage'
import { GoalsPage } from '../features/goals/GoalsPage'
import { CycleDetailPage } from '../features/goals/CycleDetailPage'

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<SignInPage />} />
      <Route path="/cadastro" element={<SignUpPage />} />

      <Route element={<RequireSession />}>
        <Route path="/inicio" element={<FirstAccountPage />} />
        <Route element={<AppShell />}>
          <Route path="/visao-geral" element={<OverviewPage />} />
          <Route path="/lancamentos" element={<EntriesPage />} />
          <Route path="/contas" element={<AccountsPage />} />
          <Route path="/contas/:id" element={<AccountDetailPage />} />
          <Route path="/cartoes" element={<CardsPage />} />
          <Route path="/cartoes/:id" element={<CardDetailPage />} />
          <Route path="/faturas" element={<InvoicesPage />} />
          <Route path="/faturas/:id" element={<InvoiceDetailPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/planejamento" element={<PlanningPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/metas/:id" element={<CycleDetailPage />} />
          <Route path="/perfil" element={<ProfileRoute />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/visao-geral" replace />} />
    </Routes>
  )
}
