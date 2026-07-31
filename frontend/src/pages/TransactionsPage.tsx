import { useState, type FormEvent } from 'react'
import { useCategories, useCreateTransaction, useTransactions } from '../api/hooks'
import { formatCurrency, formatDate } from '../lib/format'
import AsyncState from '../components/AsyncState'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function TransactionsPage() {
  const { data: transactions, isLoading, error } = useTransactions()
  const { data: categories } = useCategories()
  const createTransaction = useCreateTransaction()

  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!amount || !categoryId) return
    createTransaction.mutate(
      {
        date,
        amount: Number(amount),
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

        {createTransaction.isError && (
          <p className="async-state async-state--error">{(createTransaction.error as Error).message}</p>
        )}

        <button className="btn-primary" type="submit" disabled={createTransaction.isPending}>
          {createTransaction.isPending ? 'Adding…' : 'Add transaction'}
        </button>
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
