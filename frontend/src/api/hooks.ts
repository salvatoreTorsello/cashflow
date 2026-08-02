import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  CategoryCreate,
  CommitmentCreate,
  CommitmentStatus,
  CommitmentUpdate,
  TransactionCreate,
  TransactionUpdate,
} from './types'

const keys = {
  categories: ['categories'] as const,
  transactions: ['transactions'] as const,
  commitments: (status?: CommitmentStatus) => ['commitments', status ?? 'all'] as const,
  dashboard: ['dashboard'] as const,
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: api.categories.list })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CategoryCreate) => api.categories.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories }),
  })
}

export function useTransactions() {
  return useQuery({ queryKey: keys.transactions, queryFn: api.transactions.list })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TransactionCreate) => api.transactions.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions })
      qc.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TransactionUpdate }) => api.transactions.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions })
      qc.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.transactions.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions })
      qc.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useCommitments(status?: CommitmentStatus) {
  return useQuery({ queryKey: keys.commitments(status), queryFn: () => api.commitments.list(status) })
}

export function useCreateCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CommitmentCreate) => api.commitments.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commitments'] })
      qc.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useUpdateCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CommitmentUpdate }) => api.commitments.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commitments'] })
      qc.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useDeleteCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.commitments.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commitments'] })
      qc.invalidateQueries({ queryKey: keys.transactions })
      qc.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useExecuteCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.commitments.execute(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commitments'] })
      qc.invalidateQueries({ queryKey: keys.transactions })
      qc.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}

export function useDashboard() {
  return useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard.get })
}
