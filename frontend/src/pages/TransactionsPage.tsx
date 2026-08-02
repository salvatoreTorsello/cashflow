import { useState, type FormEvent } from 'react'
import type { Transaction } from '../api/types'
import {
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '../api/hooks'
import { formatCurrency, formatDate } from '../lib/format'
import AsyncState from '../components/AsyncState'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function TransactionsPage() {
  const { data: transactions, isLoading, error } = useTransactions()
  const { data: categories } = useCategories()
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const deleteTransaction = useDeleteTransaction()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')

  const isEditing = editingId !== null
  const isSaving = createTransaction.isPending || updateTransaction.isPending

  function resetForm() {
    setEditingId(null)
    setDate(todayISO())
    setAmount('')
    setCategoryId('')
    setDescription('')
  }

  function handleEdit(t: Transaction) {
    setEditingId(t.id)
    setDate(t.date)
    setAmount(t.amount)
    setCategoryId(String(t.category_id))
    setDescription(t.description ?? '')
  }

  function handleDelete(t: Transaction) {
    if (!window.confirm('Delete this transaction?')) return
    deleteTransaction.mutate(t.id)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!amount || !categoryId) return
    const body = {
      date,
      amount: Number(amount),
      category_id: Number(categoryId),
      description: description || null,
    }

    if (editingId !== null) {
      updateTransaction.mutate({ id: editingId, body }, { onSuccess: resetForm })
    } else {
      createTransaction.mutate(body, { onSuccess: resetForm })
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Transactions</h1>

      <form className="form-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <label className="field">
          <span>Amount</span>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 2400 or -180"
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

        {(createTransaction.isError || updateTransaction.isError) && (
          <p className="async-state async-state--error">
            {((updateTransaction.error ?? createTransaction.error) as Error).message}
          </p>
        )}

        <div className="btn-text-group">
          <button className="btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add transaction'}
          </button>
          {isEditing && (
            <button className="btn-secondary" type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="section">
        <h2 className="section-title">History</h2>
        <AsyncState isLoading={isLoading} error={error} isEmpty={transactions?.length === 0} emptyLabel="No transactions yet." />
        <ul className="list">
          {transactions?.map((t) => (
            <li className="list-card" key={t.id}>
              <div className="list-card-main">
                <span className="list-card-title">{t.description ?? t.category.name}</span>
                <span className="list-card-subtitle">
                  {t.category.name} · {formatDate(t.date)}
                </span>
                <div className="btn-text-group">
                  <button className="btn-text" type="button" onClick={() => handleEdit(t)}>
                    Edit
                  </button>
                  <button className="btn-text btn-text--danger" type="button" onClick={() => handleDelete(t)}>
                    Delete
                  </button>
                </div>
              </div>
              <span className={`list-card-amount ${Number(t.amount) >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
