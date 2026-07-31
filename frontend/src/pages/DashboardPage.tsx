import { useDashboard } from '../api/hooks'
import { formatCurrency, formatDate } from '../lib/format'
import StatCard from '../components/StatCard'
import AsyncState from '../components/AsyncState'

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard()

  return (
    <div className="page">
      <h1 className="page-title">CashFlow</h1>

      <AsyncState isLoading={isLoading} error={error} />

      {data && (
        <>
          <div className="stat-grid">
            <StatCard label="Balance" value={formatCurrency(data.balance)} />
            <StatCard
              label="Safe margin"
              value={formatCurrency(data.safe_margin)}
              tone={Number(data.safe_margin) >= 0 ? 'positive' : 'negative'}
            />
            <StatCard
              label="Pending commitments"
              value={formatCurrency(data.pending_commitments_total)}
              tone="negative"
            />
          </div>

          <section className="section">
            <h2 className="section-title">Next commitment</h2>
            {data.next_commitment ? (
              <div className="list-card">
                <div className="list-card-main">
                  <span className="list-card-title">{data.next_commitment.description ?? data.next_commitment.category.name}</span>
                  <span className="list-card-subtitle">
                    {data.next_commitment.category.name} · due {formatDate(data.next_commitment.due_date)}
                  </span>
                </div>
                <span className="list-card-amount negative">{formatCurrency(data.next_commitment.amount)}</span>
              </div>
            ) : (
              <p className="async-state">No pending commitments.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
