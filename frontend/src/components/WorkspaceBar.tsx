import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

export default function WorkspaceBar() {
  const { logout } = useAuth()
  const { workspaces, currentWorkspace, selectWorkspace, createWorkspace, createError } =
    useWorkspace()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSelectChange(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === '__new__') {
      setIsCreating(true)
      return
    }
    selectWorkspace(Number(e.target.value))
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      await createWorkspace({ name: trimmed })
      setNewName('')
      setIsCreating(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="workspace-bar">
      {isCreating ? (
        <form className="workspace-bar-new" onSubmit={handleCreate}>
          <input
            type="text"
            autoFocus
            placeholder="New cashflow name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn-text" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add'}
          </button>
          <button className="btn-text" type="button" onClick={() => setIsCreating(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <select
          className="workspace-select"
          value={currentWorkspace?.id ?? ''}
          onChange={handleSelectChange}
          aria-label="Current cashflow"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          <option value="__new__">+ New cashflow…</option>
        </select>
      )}

      {createError && !isCreating && <p className="async-state async-state--error">{createError}</p>}

      <button className="btn-text" type="button" onClick={() => logout()}>
        Log out
      </button>
    </div>
  )
}
