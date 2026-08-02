export type CommitmentStatus = 'pending' | 'confirmed' | 'paid'

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

export interface Commitment {
  id: number
  due_date: string
  amount: string
  category_id: number
  category: Category
  description: string | null
  status: CommitmentStatus
}

export interface CommitmentCreate {
  due_date: string
  amount: number
  category_id: number
  description?: string | null
  status?: CommitmentStatus
}

export interface CommitmentUpdate {
  due_date?: string
  amount?: number
  category_id?: number
  description?: string | null
  status?: CommitmentStatus
}

export interface DashboardSummary {
  balance: string
  pending_commitments_total: string
  safe_margin: string
  next_commitment: Commitment | null
}