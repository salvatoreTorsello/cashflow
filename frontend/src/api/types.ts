export type CommitmentStatus = 'pending' | 'confirmed' | 'paid'

export interface User {
  id: number
  email: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface Workspace {
  id: number
  name: string
  created_at: string
}

export interface WorkspaceCreate {
  name: string
}

export interface WorkspaceUpdate {
  name: string
}

export interface Category {
  id: number
  name: string
}

export interface CategoryCreate {
  name: string
}

// FastAPI serializes Pydantic Decimal fields as JSON strings (e.g. "2400.50"), not numbers.
export interface Transaction {
  id: number
  date: string
  amount: string
  category_id: number
  category: Category
  description: string | null
  commitment_id: number | null
  created_at: string
}

export interface TransactionCreate {
  date: string
  amount: number
  category_id: number
  description?: string | null
  commitment_id?: number | null
}

export interface TransactionUpdate {
  date?: string
  amount?: number
  category_id?: number
  description?: string | null
  commitment_id?: number | null
}

export type CommitmentType = 'one_time' | 'periodic' | 'installment'
export type IntervalUnit = 'day' | 'week' | 'month' | 'year'

export interface CommitmentSeries {
  id: number
  type: CommitmentType
  interval_count: number
  interval_unit: IntervalUnit
  total_installments: number | null
}

export interface Commitment {
  id: number
  due_date: string
  amount: string
  category_id: number
  category: Category
  description: string | null
  status: CommitmentStatus
  series_id: number | null
  installment_number: number | null
  series: CommitmentSeries | null
}

export interface CommitmentCreate {
  type?: CommitmentType
  due_date: string
  category_id: number
  description?: string | null
  status?: CommitmentStatus
  // one_time and periodic: a single repeated amount.
  amount?: number
  // periodic and installment.
  interval_count?: number
  interval_unit?: IntervalUnit
  // installment only.
  total_installments?: number
  installment_amounts?: number[]
}

export interface CommitmentUpdate {
  due_date?: string
  amount?: number
  category_id?: number
  description?: string | null
  status?: CommitmentStatus
}

export interface CommitmentExecute {
  date?: string
  amount?: number
  description?: string | null
}

export interface DashboardSummary {
  balance: string
  pending_commitments_total: string
  safe_margin: string
  next_commitment: Commitment | null
}

export interface PredictionPoint {
  date: string
  balance: string
}

export interface PredictionResponse {
  average_salary: string
  series: PredictionPoint[]
  selected: PredictionPoint | null
}