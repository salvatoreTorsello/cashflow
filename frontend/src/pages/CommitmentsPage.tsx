import { useState, type FormEvent } from 'react'
import type { Commitment, CommitmentStatus } from '../api/types'
import {
  useCategories,
  useCommitments,
  useCreateCommitment,
  useDeleteCommitment,
  useDeleteTransaction,
  useExecuteCommitment,
  useTransactions,
  useUpdateCommitment,
} from '../api/hooks'
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
  const { data: transactions } = useTransactions()
  const createCommitment = useCreateCommitment()
  const updateCommitment = useUpdateCommitment()
  const executeCommitment = useExecuteCommitment()
  const deleteCommitment = useDeleteCommitment()
  const deleteTransaction = useDeleteTransaction()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [dueDate, setDueDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')

  const [payingId, setPayingId] = useState<number | null>(null)
  const [payDate, setPayDate] = useState(todayISO())
  const [payAmount, setPayAmount] = useState('')
  const [payDescription, setPayDescription] = useState('')

  const isEditing = editingId !== null
  const isSaving = createCommitment.isPending || updateCommitment.isPending

  function resetForm() {
    setEditingId(null)
    setDueDate(todayISO())
    setAmount('')
    setCategoryId('')
    setDescription('')
  }

  function handleEdit(c: Commitment) {
    setEditingId(c.id)
    setDueDate(c.due_date)
    setAmount(String(Math.abs(Number(c.amount))))
    setCategoryId(String(c.category_id))
    setDescription(c.description ?? '')
  }

  function startPay(c: Commitment) {
    setPayingId(c.id)
    setPayDate(todayISO())
    setPayAmount(String(Math.abs(Number(c.amount))))
    setPayDescription(c.description ?? '')
  }

  function cancelPay() {
    setPayingId(null)
  }

  function confirmPay(c: Commitment) {
    const magnitude = Number(payAmount)
    if (!magnitude) return
    executeCommitment.mutate(
      {
        id: c.id,
        body: {
          date: payDate,
          amount: -Math.abs(magnitude),
          description: payDescription || null,
        },
      },
      { onSuccess: () => setPayingId(null) },
    )
  }

  function handleDelete(c: Commitment) {
    if (!window.confirm('Delete this commitment?')) return
    const linkedTransaction = transactions?.find((t) => t.commitment_id === c.id)
    deleteCommitment.mutate(c.id, {
      onSuccess: () => {
        if (linkedTransaction && window.confirm('Also delete the linked transaction?')) {
          deleteTransaction.mutate(linkedTransaction.id)
        }
      },
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const magnitude = Number(amount)
    if (!magnitude || !categoryId) return
    const body = {
      due_date: dueDate,
      amount: -Math.abs(magnitude),
      category_id: Number(categoryId),
      description: description || null,
    }

    if (editingId !== null) {
      updateCommitment.mutate({ id: editingId, body }, { onSuccess: resetForm })
    } else {
      createCommitment.mutate(body, { onSuccess: resetForm })
    }
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

        {(createCommitment.isError || updateCommitment.isError) && (
          <p className="async-state async-state--error">
            {((updateCommitment.error ?? createCommitment.error) as Error).message}
          </p>
        )}

        <div className="btn-text-group">
          <button className="btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add commitment'}
          </button>
          {isEditing && (
            <button className="btn-secondary" type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
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
          {commitments?.map((c) =>
            payingId === c.id ? (
              <li className="list-card pay-confirm" key={c.id}>
                <div className="pay-confirm-form">
                  <p className="async-state">Confirm the payment details before recording it as a transaction.</p>
                  <div className="field-row">
                    <label className="field">
                      <span>Date</span>
                      <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Amount</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Description</span>
                    <input
                      type="text"
                      value={payDescription}
                      onChange={(e) => setPayDescription(e.target.value)}
                    />
                  </label>
                  {executeCommitment.isError && (
                    <p className="async-state async-state--error">{(executeCommitment.error as Error).message}</p>
                  )}
                  <div className="btn-text-group">
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={() => confirmPay(c)}
                      disabled={executeCommitment.isPending}
                    >
                      {executeCommitment.isPending ? 'Confirming…' : 'Confirm payment'}
                    </button>
                    <button className="btn-secondary" type="button" onClick={cancelPay}>
                      Cancel
                    </button>
                  </div>
                </div>
              </li>
            ) : (
              <li className="list-card" key={c.id}>
                <div className="list-card-main">
                  <span className="list-card-title">{c.description ?? c.category.name}</span>
                  <span className="list-card-subtitle">
                    {c.category.name} · due {formatDate(c.due_date)} · <span className={`badge badge--${c.status}`}>{c.status}</span>
                  </span>
                  <div className="btn-text-group">
                    <button className="btn-text" type="button" onClick={() => handleEdit(c)}>
                      Edit
                    </button>
                    <button className="btn-text btn-text--danger" type="button" onClick={() => handleDelete(c)}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="list-card-actions">
                  <span className="list-card-amount negative">{formatCurrency(c.amount)}</span>
                  {c.status !== 'paid' && (
                    <button className="btn-secondary" onClick={() => startPay(c)}>
                      Pay
                    </button>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  )
}
