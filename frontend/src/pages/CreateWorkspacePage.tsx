import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

export default function CreateWorkspacePage() {
  const { logout } = useAuth()
  const { workspaces, createWorkspace } = useWorkspace()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setError(null)
    setIsSubmitting(true)
    try {
      await createWorkspace({ name: trimmed })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page auth-page">
      <h1 className="page-title">
        {workspaces.length === 0 ? 'Create your first cashflow' : 'Create a new cashflow'}
      </h1>
      <p className="auth-hint">
        A workspace tracks one cashflow — its own balance, categories, and commitments. You can
        create more later and switch between them anytime.
      </p>

      <form className="form-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            placeholder="e.g. Personal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        {error && <p className="async-state async-state--error">{error}</p>}

        <button className="btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create cashflow'}
        </button>
      </form>

      <button className="btn-text" type="button" onClick={() => logout()}>
        Log out
      </button>
    </div>
  )
}
