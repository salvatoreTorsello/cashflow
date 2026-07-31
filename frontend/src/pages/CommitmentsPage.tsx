import { useState, type FormEvent } from 'react'
import type { CommitmentStatus } from '../api/types'
import { useCategories, useCommitments, useCreateCommitment, useExecuteCommitment } from '../api/hooks'
import { formatCurrency, formatDate } from '../lib/format'
import AsyncState from '../components/AsyncState'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const FILTERS: Array<{ label: string; value: CommitmentStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Paid', value: 'paid' },
]

export default function CommitmentsPage() {
  const [filter, setFilter] = useState<CommitmentStatus | undefined>('pending')
  const { data: commitments, isLoading, error } = useCommitments(filter)
  const { data: categories } = useCategories()
  const createCommitment = useCreateCommitment()
  const executeCommitment = useExecuteCommitment()

  const [dueDate, setDueDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const magnitude = Number(amount)
    if (!magnitude || !categoryId) return
    createCommitment.mutate(
      {
        due_date: dueDate,
        amount: -Math.abs(magnitude),
        category_id: Number(categoryId),
        description: description || null,
      },
      {
        onSuccess: () => {
          setAmount('')
          setDescription('')
        },
      },
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">Commitments</h1>

      <form className="form-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </label>

        <label className="field">
          <span>Amount</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 1450"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="" disabled>
              Select a category
            </option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Description</span>
          <input
            type="text"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {createCommitment.isError && (
          <p className="async-state async-state--error">{(createCommitment.error as Error).message}</p>
        )}

        <button className="btn-primary" type="submit" disabled={createCommitment.isPending}>
          {createCommitment.isPending ? 'Adding…' : 'Add commitment'}
        </button>
      </form>

      <section className="section">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              className={`tab${filter === f.value ? ' active' : ''}`}
              onClick={() => setFilter(f.value)}
              type="button"
            >
              {f.label}
            </button>
          ))}
        </div>

        <AsyncState isLoading={isLoading} error={error} isEmpty={commitments?.length === 0} emptyLabel="No commitments here." />
        <ul className="list">
          {commitments?.map((c) => (
            <li className="list-card" key={c.id}>
              <div className="list-card-main">
                <span className="list-card-title">{c.description ?? c.category.name}</span>
                <span className="list-card-subtitle">
                  {c.category.name} · due {formatDate(c.due_date)} · <span className={`badge badge--${c.status}`}>{c.status}</span>
                </span>
              </div>
              <div className="list-card-actions">
                <span className="list-card-amount negative">{formatCurrency(c.amount)}</span>
                {c.status !== 'paid' && (
                  <button
                    className="btn-secondary"
                    onClick={() => executeCommitment.mutate(c.id)}
                    disabled={executeCommitment.isPending}
                  >
                    Pay
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
