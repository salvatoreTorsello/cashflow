import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

export default function CreateWorkspacePage() {
  const { logout } = useAuth()
  const { workspaces, createWorkspace, joinWorkspace } = useWorkspace()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function switchMode(next: 'create' | 'join') {
    setMode(next)
    setError(null)
  }

  async function handleCreate(e: FormEvent) {
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

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return

    setError(null)
    setIsSubmitting(true)
    try {
      await joinWorkspace({ code: trimmed })
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

      <div className="tabs">
        <button
          type="button"
          className={`tab${mode === 'create' ? ' active' : ''}`}
          onClick={() => switchMode('create')}
        >
          Create new
        </button>
        <button
          type="button"
          className={`tab${mode === 'join' ? ' active' : ''}`}
          onClick={() => switchMode('join')}
        >
          Join with a code
        </button>
      </div>

      {mode === 'create' ? (
        <form className="form-card" onSubmit={handleCreate}>
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
      ) : (
        <form className="form-card" onSubmit={handleJoin}>
          <label className="field">
            <span>Invite code</span>
            <input
              type="text"
              placeholder="Paste the code someone shared with you"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>

          {error && <p className="async-state async-state--error">{error}</p>}

          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Joining…' : 'Join cashflow'}
          </button>
        </form>
      )}

      <button className="btn-text" type="button" onClick={() => logout()}>
        Log out
      </button>
    </div>
  )
}
