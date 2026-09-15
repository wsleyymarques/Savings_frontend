import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { PasswordField, TextField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useSession } from '../../app/contexts'
import { fieldsFor, messageFor } from '../../services'
import { lastHubRoute } from '../../app/modules'

export function SignInPage() {
  const { status, switching, signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to={lastHubRoute()} replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFields({})
    setError(null)
    try {
      await signIn({ email, password })
    } catch (caught) {
      const caughtFields = fieldsFor(caught)
      setFields(caughtFields)
      if (Object.keys(caughtFields).length === 0) setError(messageFor(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={handleSubmit} noValidate>
        <p className="auth__brand">
          <span className="sidebar__mark" aria-hidden="true" />
          Wesley Hub
        </p>
        <h1 className="auth__title">{switching ? 'Entrar com outro usuário' : 'Entrar'}</h1>
        {switching ? (
          <InlineAlert tone="info">
            A sessão anterior foi encerrada. Informe as credenciais do próximo usuário.
          </InlineAlert>
        ) : null}
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

        <TextField
          label="E-mail"
          type="email"
          value={email}
          autoComplete="email"
          error={fields.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          label="Senha"
          value={password}
          autoComplete="current-password"
          visible={visible}
          error={fields.password}
          onToggleVisible={() => setVisible((current) => !current)}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" variant="primary" block loading={submitting} loadingLabel="Entrando…">
          Entrar
        </Button>
        <p className="auth__footer">
          Ainda não tem conta? <Link to="/cadastro">Criar cadastro</Link>
        </p>
      </form>
    </div>
  )
}
