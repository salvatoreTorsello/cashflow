import type {
  Category,
  CategoryCreate,
  Commitment,
  CommitmentCreate,
  CommitmentStatus,
  CommitmentUpdate,
  DashboardSummary,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
} from './types'

const BASE_URL = '/api/v1'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      // error body wasn't JSON — fall back to statusText
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  categories: {
    list: () => request<Category[]>('/categories'),
    create: (body: CategoryCreate) =>
      request<Category>('/categories', { method: 'POST', body: JSON.stringify(body) }),
  },
  transactions: {
    list: () => request<Transaction[]>('/transactions'),
    create: (body: TransactionCreate) =>
      request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: TransactionUpdate) =>
      request<Transaction>(`/transactions/${id}/edit`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  },
  commitments: {
    list: (status?: CommitmentStatus) =>
      request<Commitment[]>(`/commitments${status ? `?status=${status}` : ''}`),
    create: (body: CommitmentCreate) =>
      request<Commitment>('/commitments', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: CommitmentUpdate) =>
      request<Commitment>(`/commitments/${id}/edit`, { method: 'PUT', body: JSON.stringify(body) }),
    execute: (id: number) =>
      request<Transaction>(`/commitments/${id}/execute`, { method: 'POST' }),
    delete: (id: number) => request<void>(`/commitments/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    get: () => request<DashboardSummary>('/dashboard'),
  },
}
