import { Suspense, lazy } from 'react'
import { useCommitments, useDashboard, useTransactions } from '../api/hooks'
import { monthlyNetCashFlow } from '../lib/aggregate'
import { formatCurrency } from '../lib/format'
import StatCard from '../components/StatCard'
import AsyncState from '../components/AsyncState'
import CommitmentsTimeline from '../components/CommitmentsTimeline'

// Recharts is the single heaviest dependency in the bundle — defer it off the critical path.
const BurnRateChart = lazy(() => import('../components/BurnRateChart'))

const UPCOMING_LIMIT = 5

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard()
  const { data: transactions } = useTransactions()
  const { data: upcoming, isLoading: upcomingLoading, error: upcomingError } = useCommitments('pending')

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
            <h2 className="section-title">Cash flow by month</h2>
            {transactions && (
              <Suspense fallback={<div className="chart-placeholder" />}>
                <BurnRateChart data={monthlyNetCashFlow(transactions)} />
              </Suspense>
            )}
          </section>

          <section className="section">
            <h2 className="section-title">Upcoming</h2>
            <AsyncState isLoading={upcomingLoading} error={upcomingError} isEmpty={upcoming?.length === 0} emptyLabel="No pending commitments." />
            {upcoming && <CommitmentsTimeline commitments={upcoming.slice(0, UPCOMING_LIMIT)} />}
          </section>
        </>
      )}
    </div>
  )
}
