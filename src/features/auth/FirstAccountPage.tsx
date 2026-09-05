import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { DateField, MoneyField, TextField } from '../../components/ui/Field'
import { InlineAlert } from '../../components/ui/States'
import { useSession } from '../../app/contexts'
import { useAccountMutation, useAccountsQuery } from '../../services/queries'
import { fieldsFor, messageFor } from '../../services'
import { parseMoney } from '../../lib/money'
import { today } from '../../lib/today'

export function FirstAccountPage() {
  const { status } = useSession()
  const navigate = useNavigate()
  const accounts = useAccountsQuery({ accountId: null }, status === 'authenticated')
  const mutation = useAccountMutation()

  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [referenceDate, setReferenceDate] = useState(today())
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  if (status === 'anonymous') return <Navigate to="/entrar" replace />
  if (accounts.isSuccess && accounts.data.length > 0) return <Navigate to="/visao-geral" replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = parseMoney(balance || '0')
    if (!parsed.ok) {
      setFields({ initialBalance: parsed.reason })
      return
    }
    setFields({})
    setError(null)
    try {
      await mutation.mutateAsync({ name, initialBalance: parsed.cents, referenceDate })
      navigate('/visao-geral')
    } catch (caught) {
      const caughtFields = fieldsFor(caught)
      setFields(caughtFields)
      if (Object.keys(caughtFields).length === 0) setError(messageFor(caught))
    }
  }

  return (
    <div className="auth">
      <form className="auth__card auth__card--wide" onSubmit={handleSubmit} noValidate>
        <p className="auth__brand">
          <span className="sidebar__mark" aria-hidden="true" />
          Minhas Finanças
        </p>
        <h1 className="auth__title">Vamos cadastrar sua primeira conta</h1>
        <p className="text-secondary">
          A conta financeira é onde o dinheiro é acompanhado. O saldo inicial é o dinheiro existente
          quando você começa a usar o sistema; ele não conta como receita do período.
        </p>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

        <TextField
          label="Nome da conta"
          value={name}
          maxLength={60}
          placeholder="Conta Principal"
          error={fields.name}
          onChange={(event) => setName(event.target.value)}
        />
        <MoneyField
          label="Saldo inicial"
          value={balance}
          error={fields.initialBalance}
          onChange={setBalance}
        />
        <DateField
          label="Data de referência"
          value={referenceDate}
          error={fields.referenceDate}
          onChange={setReferenceDate}
        />

        <Button
          type="submit"
          variant="primary"
          block
          loading={mutation.isPending}
          loadingLabel="Criando…"
        >
          Criar conta
        </Button>
        <Button variant="ghost" block onClick={() => navigate('/visao-geral')}>
          Fazer depois
        </Button>
      </form>
    </div>
  )
}
