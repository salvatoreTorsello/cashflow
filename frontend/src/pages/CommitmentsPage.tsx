import { Suspense, lazy, useState, type FormEvent } from 'react'
import type { Commitment, CommitmentStatus, CommitmentType, IntervalUnit } from '../api/types'
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
import { monthlyCommitmentTotals } from '../lib/aggregate'
import { formatCurrency, formatDate } from '../lib/format'
import AsyncState from '../components/AsyncState'

const BurnRateChart = lazy(() => import('../components/BurnRateChart'))

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Client-side preview only — the server computes the authoritative dates.
function addIntervalPreview(dateStr: string, count: number, unit: IntervalUnit): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (unit === 'day') {
    d.setDate(d.getDate() + count)
  } else if (unit === 'week') {
    d.setDate(d.getDate() + count * 7)
  } else if (unit === 'month' || unit === 'year') {
    const day = d.getDate()
    d.setDate(1)
    if (unit === 'month') d.setMonth(d.getMonth() + count)
    else d.setFullYear(d.getFullYear() + count)
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, lastDayOfMonth))
  }
  return d.toISOString().slice(0, 10)
}

const FILTERS: Array<{ label: string; value: CommitmentStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Paid', value: 'paid' },
]

type PeriodPresetKey = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom'

const PERIOD_PRESETS: Record<Exclude<PeriodPresetKey, 'custom'>, { label: string; count: number; unit: IntervalUnit }> = {
  weekly: { label: 'Weekly', count: 1, unit: 'week' },
  biweekly: { label: 'Every 2 weeks', count: 2, unit: 'week' },
  monthly: { label: 'Monthly', count: 1, unit: 'month' },
  quarterly: { label: 'Every 3 months', count: 3, unit: 'month' },
  semiannual: { label: 'Every 6 months', count: 6, unit: 'month' },
  yearly: { label: 'Yearly', count: 1, unit: 'year' },
}

const UNIT_LABELS: Record<IntervalUnit, string> = {
  day: 'day(s)',
  week: 'week(s)',
  month: 'month(s)',
  year: 'year(s)',
}

export default function CommitmentsPage() {
  const [filter, setFilter] = useState<CommitmentStatus | undefined>('pending')
  const { data: commitments, isLoading, error } = useCommitments(filter)
  const { data: allCommitments } = useCommitments()
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

  const [type, setType] = useState<CommitmentType>('one_time')
  const [periodPreset, setPeriodPreset] = useState<PeriodPresetKey>('monthly')
  const [customCount, setCustomCount] = useState('1')
  const [customUnit, setCustomUnit] = useState<IntervalUnit>('month')
  const [totalInstallments, setTotalInstallments] = useState('')
  const [installmentAmounts, setInstallmentAmounts] = useState<string[]>([])

  const [payingId, setPayingId] = useState<number | null>(null)
  const [payDate, setPayDate] = useState(todayISO())
  const [payAmount, setPayAmount] = useState('')
  const [payDescription, setPayDescription] = useState('')

  const isEditing = editingId !== null
  const isSaving = createCommitment.isPending || updateCommitment.isPending

  const { count: intervalCount, unit: intervalUnit } =
    periodPreset === 'custom'
      ? { count: Number(customCount) || 1, unit: customUnit }
      : PERIOD_PRESETS[periodPreset]

  function resetForm() {
    setEditingId(null)
    setDueDate(todayISO())
    setAmount('')
    setCategoryId('')
    setDescription('')
    setType('one_time')
    setPeriodPreset('monthly')
    setCustomCount('1')
    setCustomUnit('month')
    setTotalInstallments('')
    setInstallmentAmounts([])
  }

  function handleTotalInstallmentsChange(value: string) {
    setTotalInstallments(value)
    const n = Math.max(0, Math.floor(Number(value) || 0))
    setInstallmentAmounts((prev) => {
      const next = prev.slice(0, n)
      while (next.length < n) next.push('')
      return next
    })
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

    let scope: 'single' | 'series' = 'single'
    if (c.series_id !== null) {
      scope = window.confirm(
        'This commitment is part of a recurring series.\n\n' +
          'OK — delete this AND all future unpaid occurrences in the series.\n' +
          'Cancel — delete only this one occurrence.',
      )
        ? 'series'
        : 'single'
    }

    const linkedTransaction = transactions?.find((t) => t.commitment_id === c.id)
    deleteCommitment.mutate(
      { id: c.id, scope },
      {
        onSuccess: () => {
          if (linkedTransaction && window.confirm('Also delete the linked transaction?')) {
            deleteTransaction.mutate(linkedTransaction.id)
          }
        },
      },
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!categoryId) return

    if (editingId !== null) {
      const magnitude = Number(amount)
      if (!magnitude) return
      updateCommitment.mutate(
        {
          id: editingId,
          body: {
            due_date: dueDate,
            amount: -Math.abs(magnitude),
            category_id: Number(categoryId),
            description: description || null,
          },
        },
        { onSuccess: resetForm },
      )
      return
    }

    if (type === 'one_time') {
      const magnitude = Number(amount)
      if (!magnitude) return
      createCommitment.mutate(
        {
          type: 'one_time',
          due_date: dueDate,
          amount: -Math.abs(magnitude),
          category_id: Number(categoryId),
          description: description || null,
        },
        { onSuccess: resetForm },
      )
      return
    }

    if (type === 'periodic') {
      const magnitude = Number(amount)
      if (!magnitude || !description) return
      createCommitment.mutate(
        {
          type: 'periodic',
          due_date: dueDate,
          amount: -Math.abs(magnitude),
          category_id: Number(categoryId),
          description,
          interval_count: intervalCount,
          interval_unit: intervalUnit,
        },
        { onSuccess: resetForm },
      )
      return
    }

    // installment
    const total = Number(totalInstallments)
    if (!total || !description) return
    const amounts = installmentAmounts.map((a) => -Math.abs(Number(a)))
    if (amounts.length !== total || amounts.some((a) => !a)) return
    createCommitment.mutate(
      {
        type: 'installment',
        due_date: dueDate,
        category_id: Number(categoryId),
        description,
        interval_count: intervalCount,
        interval_unit: intervalUnit,
        total_installments: total,
        installment_amounts: amounts,
      },
      { onSuccess: resetForm },
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">Commitments</h1>

      <form className="form-card" onSubmit={handleSubmit}>
        {!isEditing && (
          <label className="field">
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as CommitmentType)}>
              <option value="one_time">One-time</option>
              <option value="periodic">Periodic (repeats)</option>
              <option value="installment">Installment (fixed number of payments)</option>
            </select>
          </label>
        )}

        <label className="field">
          <span>{type === 'one_time' || isEditing ? 'Due date' : 'Start date'}</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </label>

        {!isEditing && type !== 'one_time' && (
          <label className="field">
            <span>Repeats</span>
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as PeriodPresetKey)}
            >
              {Object.entries(PERIOD_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </label>
        )}

        {!isEditing && type !== 'one_time' && periodPreset === 'custom' && (
          <div className="field-row">
            <label className="field">
              <span>Every</span>
              <input
                type="number"
                min="1"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Unit</span>
              <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value as IntervalUnit)}>
                {(Object.keys(UNIT_LABELS) as IntervalUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {(isEditing || type === 'one_time' || type === 'periodic') && (
          <label className="field">
            <span>{type === 'periodic' && !isEditing ? 'Amount (repeated each period)' : 'Amount'}</span>
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
        )}

        {!isEditing && type === 'installment' && (
          <label className="field">
            <span>Total installments</span>
            <input
              type="number"
              min="1"
              value={totalInstallments}
              onChange={(e) => handleTotalInstallmentsChange(e.target.value)}
              required
            />
          </label>
        )}

        <label className="field">
          <span>Category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="" disabled>
              Select a category
            </option>
            {categories
              ?.filter((c) => c.name !== 'salary')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>

        <label className="field">
          <span>Description{!isEditing && type !== 'one_time' ? ' (required for a series)' : ''}</span>
          <input
            type="text"
            placeholder={!isEditing && type !== 'one_time' ? 'Required' : 'Optional'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required={!isEditing && type !== 'one_time'}
          />
        </label>

        {!isEditing && type === 'installment' && installmentAmounts.length > 0 && (
          <div className="installment-list">
            <span className="section-title">Installment amounts</span>
            <div className="list">
              {installmentAmounts.map((value, i) => {
                const previewDate = addIntervalPreview(dueDate, intervalCount * i, intervalUnit)
                return (
                  <label className="field" key={i}>
                    <span>
                      #{i + 1}/{installmentAmounts.length} · due {formatDate(previewDate)}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={value}
                      onChange={(e) => {
                        const next = [...installmentAmounts]
                        next[i] = e.target.value
                        setInstallmentAmounts(next)
                      }}
                      required
                    />
                  </label>
                )
              })}
            </div>
          </div>
        )}

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
        <h2 className="section-title">Commitments by month — next 5 months</h2>
        {allCommitments && (
          <Suspense fallback={<div className="chart-placeholder" />}>
            <BurnRateChart data={monthlyCommitmentTotals(allCommitments)} />
          </Suspense>
        )}
      </section>

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
                    {c.series?.type === 'periodic' && ' · repeats'}
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
