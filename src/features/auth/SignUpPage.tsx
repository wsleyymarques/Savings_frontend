import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { PasswordField, TextField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useSession } from '../../app/contexts'
import { fieldsFor, messageFor } from '../../services'

export function SignUpPage() {
  const { status, signUp } = useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/inicio" replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFields({})
    setError(null)
    try {
      await signUp({ name, email, password })
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
          Minhas Finanças
        </p>
        <h1 className="auth__title">Criar cadastro</h1>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

        <TextField
          label="Nome"
          value={name}
          autoComplete="name"
          maxLength={100}
          error={fields.name}
          onChange={(event) => setName(event.target.value)}
        />
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
          autoComplete="new-password"
          visible={visible}
          hint="De 8 a 128 caracteres."
          error={fields.password}
          onToggleVisible={() => setVisible((current) => !current)}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" variant="primary" block loading={submitting} loadingLabel="Criando…">
          Criar cadastro
        </Button>
        <p className="auth__footer">
          Já tem cadastro? <Link to="/entrar">Já tenho cadastro</Link>
        </p>
      </form>
    </div>
  )
}
