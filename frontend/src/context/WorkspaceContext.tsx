import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import type { Workspace, WorkspaceCreate, WorkspaceJoinRequest } from '../api/types'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'cashflow.currentWorkspaceId'
const WORKSPACES_KEY = ['workspaces'] as const

interface WorkspaceContextValue {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  isLoading: boolean
  selectWorkspace: (id: number) => void
  createWorkspace: (body: WorkspaceCreate) => Promise<Workspace>
  createError: string | null
  joinWorkspace: (body: WorkspaceJoinRequest) => Promise<Workspace>
  joinError: string | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const qc = useQueryClient()
  const [currentId, setCurrentId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? Number(stored) : null
  })

  const { data: workspaces, isLoading } = useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: api.workspaces.list,
    enabled: !!user,
  })

  // Fall back to the first workspace if the stored id doesn't belong to
  // whoever is currently logged in — this also covers a different user
  // logging in on the same browser, since their workspace list won't
  // contain the previous user's id. No need to clear the selection on
  // logout: this check already makes a stale id harmless, and clearing it
  // would just lose the last-active workspace across a logout/login cycle.
  // `user` is null both while auth is still resolving and once it's
  // confirmed there's no session — wait for authLoading to settle so a page
  // reload doesn't touch the restored selection before the auth check
  // even comes back.
  useEffect(() => {
    if (authLoading || !user) return
    if (!workspaces || workspaces.length === 0) return
    if (!currentId || !workspaces.some((w) => w.id === currentId)) {
      setCurrentId(workspaces[0].id)
    }
  }, [user, authLoading, workspaces, currentId])

  function selectWorkspace(id: number) {
    setCurrentId(id)
    localStorage.setItem(STORAGE_KEY, String(id))
  }

  const createMutation = useMutation({
    mutationFn: api.workspaces.create,
    onSuccess: (workspace) => {
      // Patch the cache directly with the server's response instead of
      // invalidating: an invalidate-triggered refetch is async, and the
      // fallback effect above would see the new id missing from the still-
      // stale cached list and revert the selection back to the old workspace
      // before the refetch resolves.
      qc.setQueryData(WORKSPACES_KEY, (old: Workspace[] | undefined) =>
        old ? [...old, workspace] : [workspace],
      )
      selectWorkspace(workspace.id)
    },
  })

  const joinMutation = useMutation({
    mutationFn: api.workspaces.join,
    onSuccess: (workspace) => {
      qc.setQueryData(WORKSPACES_KEY, (old: Workspace[] | undefined) =>
        old ? [...old, workspace] : [workspace],
      )
      selectWorkspace(workspace.id)
    },
  })

  const currentWorkspace = workspaces?.find((w) => w.id === currentId) ?? null

  const value: WorkspaceContextValue = {
    workspaces: workspaces ?? [],
    currentWorkspace,
    isLoading,
    selectWorkspace,
    createWorkspace: (body) => createMutation.mutateAsync(body),
    createError: createMutation.error ? (createMutation.error as ApiError).message : null,
    joinWorkspace: (body) => joinMutation.mutateAsync(body),
    joinError: joinMutation.error ? (joinMutation.error as ApiError).message : null,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
