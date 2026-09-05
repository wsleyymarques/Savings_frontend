import { useState } from 'react'
import { useDrawerForm } from '../shared/useDrawerForm'
import { FormDrawer } from '../../components/layout/FormDrawer'
import { PasswordField, TextField } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { InlineAlert } from '../../components/ui/States'
import { useSession } from '../../app/contexts'
import { useToast } from '../../components/ui/toastContext'
import { fieldsFor, messageFor } from '../../services'

export function ProfileForm({ onClose }: { onClose: () => void }) {
  const { user, updateProfile, changePassword, signOut } = useSession()
  const toast = useToast()

  const form = useDrawerForm({ name: user?.name ?? '' })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)

  async function handleSubmit() {
    const ok = await form.submit(async () => {
      await updateProfile(form.values.name)
    })
    if (ok) {
      toast.notify('Perfil atualizado')
      onClose()
    }
  }

  async function handleChangePassword() {
    setChanging(true)
    setPasswordErrors({})
    setPasswordMessage(null)
    try {
      await changePassword({ currentPassword, newPassword })
      // O SDD determina invalidar as sessões e exigir novo login com a senha nova.
      toast.notify('Senha alterada. Entre novamente.')
      await signOut('sair')
    } catch (error) {
      const fields = fieldsFor(error)
      setPasswordErrors(fields)
      if (Object.keys(fields).length === 0) setPasswordMessage(messageFor(error))
    } finally {
      setChanging(false)
    }
  }

  return (
    <FormDrawer
      title="Meu perfil"
      submitLabel="Salvar"
      dirty={form.dirty}
      submitting={form.submitting}
      error={form.formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        label="Nome"
        value={form.values.name}
        maxLength={100}
        error={form.fieldErrors.name}
        onChange={(event) => form.patch({ name: event.target.value })}
      />
      <TextField label="E-mail" value={user?.email ?? ''} readOnly hint="O e-mail não é editável nesta versão." />

      <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

      <div className="stack">
        <h3 className="card-title">Alterar senha</h3>
        {passwordMessage ? <InlineAlert tone="danger">{passwordMessage}</InlineAlert> : null}
        <PasswordField
          label="Senha atual"
          value={currentPassword}
          autoComplete="current-password"
          visible={showCurrent}
          error={passwordErrors.currentPassword}
          onToggleVisible={() => setShowCurrent((value) => !value)}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <PasswordField
          label="Nova senha"
          value={newPassword}
          autoComplete="new-password"
          visible={showNew}
          hint="De 8 a 128 caracteres."
          error={passwordErrors.newPassword}
          onToggleVisible={() => setShowNew((value) => !value)}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <div>
          <Button
            variant="secondary"
            loading={changing}
            loadingLabel="Alterando…"
            disabled={!currentPassword || !newPassword}
            onClick={() => void handleChangePassword()}
          >
            Salvar nova senha
          </Button>
        </div>
        <p className="caption text-muted">
          Após alterar a senha, as sessões são encerradas e o acesso exige a nova senha.
        </p>
      </div>
    </FormDrawer>
  )
}
