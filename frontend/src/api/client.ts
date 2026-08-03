import type {
  Category,
  CategoryCreate,
  Commitment,
  CommitmentCreate,
  CommitmentExecute,
  CommitmentStatus,
  CommitmentUpdate,
  DashboardSummary,
  LoginRequest,
  PredictionResponse,
  RegisterRequest,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  User,
  Workspace,
  WorkspaceCreate,
  WorkspaceInvite,
  WorkspaceInviteStatus,
  WorkspaceJoinRequest,
  WorkspaceUpdate,
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
  auth: {
    register: (body: RegisterRequest) =>
      request<User>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: LoginRequest) =>
      request<User>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
    me: () => request<User>('/auth/me'),
  },
  workspaces: {
    list: () => request<Workspace[]>('/workspaces'),
    create: (body: WorkspaceCreate) =>
      request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(body) }),
    rename: (id: number, body: WorkspaceUpdate) =>
      request<Workspace>(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    join: (body: WorkspaceJoinRequest) =>
      request<Workspace>('/workspaces/join', { method: 'POST', body: JSON.stringify(body) }),
    createInvite: (id: number) =>
      request<WorkspaceInvite>(`/workspaces/${id}/invite`, { method: 'POST' }),
    getInviteStatus: (id: number) =>
      request<WorkspaceInviteStatus>(`/workspaces/${id}/invite`),
  },
  categories: {
    list: (workspaceId: number) => request<Category[]>(`/workspaces/${workspaceId}/categories`),
    create: (workspaceId: number, body: CategoryCreate) =>
      request<Category>(`/workspaces/${workspaceId}/categories`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  transactions: {
    list: (workspaceId: number) =>
      request<Transaction[]>(`/workspaces/${workspaceId}/transactions`),
    create: (workspaceId: number, body: TransactionCreate) =>
      request<Transaction>(`/workspaces/${workspaceId}/transactions`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (workspaceId: number, id: number, body: TransactionUpdate) =>
      request<Transaction>(`/workspaces/${workspaceId}/transactions/${id}/edit`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    delete: (workspaceId: number, id: number) =>
      request<void>(`/workspaces/${workspaceId}/transactions/${id}`, { method: 'DELETE' }),
  },
  commitments: {
    list: (workspaceId: number, status?: CommitmentStatus) =>
      request<Commitment[]>(
        `/workspaces/${workspaceId}/commitments${status ? `?status=${status}` : ''}`,
      ),
    create: (workspaceId: number, body: CommitmentCreate) =>
      request<Commitment[]>(`/workspaces/${workspaceId}/commitments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (workspaceId: number, id: number, body: CommitmentUpdate) =>
      request<Commitment>(`/workspaces/${workspaceId}/commitments/${id}/edit`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    execute: (workspaceId: number, id: number, body?: CommitmentExecute) =>
      request<Transaction>(`/workspaces/${workspaceId}/commitments/${id}/execute`, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    delete: (workspaceId: number, id: number, scope: 'single' | 'series' = 'single') =>
      request<void>(`/workspaces/${workspaceId}/commitments/${id}?scope=${scope}`, {
        method: 'DELETE',
      }),
  },
  dashboard: {
    get: (workspaceId: number) => request<DashboardSummary>(`/workspaces/${workspaceId}/dashboard`),
    predictions: (workspaceId: number, date?: string) =>
      request<PredictionResponse>(
        `/workspaces/${workspaceId}/dashboard/predictions${date ? `?date=${date}` : ''}`,
      ),
  },
}
