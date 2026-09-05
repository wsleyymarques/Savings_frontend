import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './contexts'
import { LoadingState } from '../components/ui/States'

/** Páginas privadas exigem sessão; sem sessão válida, volta ao login. */
export function RequireSession() {
  const { status } = useSession()

  if (status === 'checking') {
    return (
      <div className="auth">
        <div className="auth__card">
          <LoadingState label="Verificando sessão…" rows={2} />
        </div>
      </div>
    )
  }

  if (status === 'anonymous') return <Navigate to="/entrar" replace />
  return <Outlet />
}
