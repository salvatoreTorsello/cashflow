import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { useWorkspace } from '../context/WorkspaceContext'
import type {
  CategoryCreate,
  CommitmentCreate,
  CommitmentExecute,
  CommitmentStatus,
  CommitmentUpdate,
  TransactionCreate,
  TransactionUpdate,
} from './types'

const keys = {
  categories: (workspaceId: number | null) => ['categories', workspaceId] as const,
  transactions: (workspaceId: number | null) => ['transactions', workspaceId] as const,
  commitments: (workspaceId: number | null, status?: CommitmentStatus) =>
    ['commitments', workspaceId, status ?? 'all'] as const,
  dashboard: (workspaceId: number | null) => ['dashboard', workspaceId] as const,
  predictions: (workspaceId: number | null, date?: string) =>
    ['predictions', workspaceId, date ?? null] as const,
}

export function useCategories() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id ?? null
  return useQuery({
    queryKey: keys.categories(workspaceId),
    queryFn: () => api.categories.list(workspaceId!),
    enabled: workspaceId !== null,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace!.id
  return useMutation({
    mutationFn: (body: CategoryCreate) => api.categories.create(workspaceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories(workspaceId) }),
  })
}

export function useTransactions() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id ?? null
  return useQuery({
    queryKey: keys.transactions(workspaceId),
    queryFn: () => api.transactions.list(workspaceId!),
    enabled: workspaceId !== null,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace!.id
  return useMutation({
    mutationFn: (body: TransactionCreate) => api.transactions.create(workspaceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions(workspaceId) })
      qc.invalidateQueries({ queryKey: keys.dashboard(workspaceId) })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace!.id
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TransactionUpdate }) =>
      api.transactions.update(workspaceId, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions(workspaceId) })
      qc.invalidateQueries({ queryKey: keys.dashboard(workspaceId) })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace!.id
  return useMutation({
    mutationFn: (id: number) => api.transactions.delete(workspaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions(workspaceId) })
      qc.invalidateQueries({ queryKey: keys.dashboard(workspaceId) })
    },
  })
}

export function useCommitments(status?: CommitmentStatus) {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id ?? null
  return useQuery({
    queryKey: keys.commitments(workspaceId, status),
    queryFn: () => api.commitments.list(workspaceId!, status),
    enabled: workspaceId !== null,
  })
}

export function useCreateCommitment() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace!.id
  return useMutation({
    mutationFn: (body: CommitmentCreate) => api.commitments.create(workspaceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commitments', workspaceId] })
      qc.invalidateQueries({ queryKey: keys.dashboard(workspaceId) })
    },
  })
}

export function useUpdateCommitment() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace!.id
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CommitmentUpdate }) =>
      api.commitments.update(workspaceId, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commitments', workspaceId] })
      qc.invalidateQueries({ queryKey: keys.dashboard(workspaceId) })
    },
  })
}

export function useDeleteCommitment() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace!.id
  return useMutation({
    mutationFn: ({ id, scope }: { id: number; scope?: 'single' | 'series' }) =>
      api.commitments.delete(workspaceId, id, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commitments', workspaceId] })
      qc.invalidateQueries({ queryKey: keys.transactions(workspaceId) })
      qc.invalidateQueries({ queryKey: keys.dashboard(workspaceId) })
    },
  })
}

export function useExecuteCommitment() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace!.id
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body?: CommitmentExecute }) =>
      api.commitments.execute(workspaceId, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commitments', workspaceId] })
      qc.invalidateQueries({ queryKey: keys.transactions(workspaceId) })
      qc.invalidateQueries({ queryKey: keys.dashboard(workspaceId) })
    },
  })
}

export function useDashboard() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id ?? null
  return useQuery({
    queryKey: keys.dashboard(workspaceId),
    queryFn: () => api.dashboard.get(workspaceId!),
    enabled: workspaceId !== null,
  })
}

export function usePredictions(date?: string) {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id ?? null
  return useQuery({
    queryKey: keys.predictions(workspaceId, date),
    queryFn: () => api.dashboard.predictions(workspaceId!, date),
    enabled: workspaceId !== null,
  })
}
