import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

function secondsUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000))
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function SharePanel({ workspaceId }: { workspaceId: number }) {
  const qc = useQueryClient()
  const statusKey = ['workspace-invite', workspaceId] as const
  const [justGeneratedCode, setJustGeneratedCode] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const { data: status } = useQuery({
    queryKey: statusKey,
    queryFn: () => api.workspaces.getInviteStatus(workspaceId),
  })

  const generateMutation = useMutation({
    mutationFn: () => api.workspaces.createInvite(workspaceId),
    onSuccess: (invite) => {
      setJustGeneratedCode(invite.code)
      qc.setQueryData(statusKey, { expires_at: invite.expires_at })
    },
  })

  const expiresAt = status?.expires_at ?? null

  useEffect(() => {
    setJustGeneratedCode(null)
  }, [workspaceId])

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null)
      return
    }
    setSecondsLeft(secondsUntil(expiresAt))
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = secondsUntil(expiresAt)
        if (next === 0 && prev !== 0) setJustGeneratedCode(null)
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const isActive = expiresAt !== null && (secondsLeft ?? 0) > 0

  return (
    <div className="share-panel">
      {isActive ? (
        <>
          {justGeneratedCode ? (
            <label className="field">
              <span>Share this code — expires in {formatCountdown(secondsLeft ?? 0)}</span>
              <input type="text" readOnly value={justGeneratedCode} onFocus={(e) => e.target.select()} />
            </label>
          ) : (
            <p className="async-state">
              A code is active (expires in {formatCountdown(secondsLeft ?? 0)}), but it's only
              shown once at generation — generate a new one to see it again.
            </p>
          )}
        </>
      ) : (
        <p className="async-state">No active invite code.</p>
      )}

      {generateMutation.isError && (
        <p className="async-state async-state--error">
          {(generateMutation.error as ApiError).message}
        </p>
      )}

      <button
        className="btn-secondary"
        type="button"
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
      >
        {generateMutation.isPending ? 'Generating…' : isActive ? 'Generate new code' : 'Generate invite code'}
      </button>
    </div>
  )
}

export default function WorkspaceBar() {
  const { logout } = useAuth()
  const {
    workspaces,
    currentWorkspace,
    selectWorkspace,
    createWorkspace,
    createError,
    joinWorkspace,
    joinError,
    deleteWorkspace,
    deleteError,
  } = useWorkspace()
  const [mode, setMode] = useState<'select' | 'creating' | 'joining'>('select')
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleSelectChange(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === '__new__') {
      setMode('creating')
      return
    }
    if (e.target.value === '__join__') {
      setMode('joining')
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
      setMode('select')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    const trimmed = joinCode.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      await joinWorkspace({ code: trimmed })
      setJoinCode('')
      setMode('select')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!currentWorkspace) return
    const confirmed = window.confirm(
      `Permanently delete "${currentWorkspace.name}"?\n\n` +
        'This removes all its categories, transactions, and commitments, and revokes ' +
        'access for every member — including anyone you shared it with. This cannot be undone.',
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteWorkspace(currentWorkspace.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="workspace-bar-wrap">
      <div className="workspace-bar">
        {mode === 'creating' && (
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
            <button className="btn-text" type="button" onClick={() => setMode('select')}>
              Cancel
            </button>
          </form>
        )}

        {mode === 'joining' && (
          <form className="workspace-bar-new" onSubmit={handleJoin}>
            <input
              type="text"
              autoFocus
              placeholder="Paste invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button className="btn-text" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Joining…' : 'Join'}
            </button>
            <button className="btn-text" type="button" onClick={() => setMode('select')}>
              Cancel
            </button>
          </form>
        )}

        {mode === 'select' && (
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
            <option value="__join__">Join with a code…</option>
          </select>
        )}

        {currentWorkspace?.is_owner && mode === 'select' && (
          <button className="btn-text" type="button" onClick={() => setShowShare((v) => !v)}>
            Share
          </button>
        )}

        {currentWorkspace?.is_owner && mode === 'select' && (
          <button
            className="btn-text btn-text--danger"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        )}

        <button className="btn-text" type="button" onClick={() => logout()}>
          Log out
        </button>
      </div>

      {createError && mode !== 'creating' && (
        <p className="async-state async-state--error">{createError}</p>
      )}
      {joinError && mode !== 'joining' && (
        <p className="async-state async-state--error">{joinError}</p>
      )}
      {deleteError && <p className="async-state async-state--error">{deleteError}</p>}

      {showShare && currentWorkspace?.is_owner && <SharePanel workspaceId={currentWorkspace.id} />}
    </div>
  )
}
