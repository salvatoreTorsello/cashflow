import { Suspense, lazy, useState } from 'react'
import { usePredictions } from '../api/hooks'
import type { MonthlyNet } from '../lib/aggregate'
import { formatCurrency, formatDate } from '../lib/format'
import StatCard from '../components/StatCard'
import AsyncState from '../components/AsyncState'

const BurnRateChart = lazy(() => import('../components/BurnRateChart'))

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function toMonthlyNet(point: { date: string; balance: string }): MonthlyNet {
  return { key: point.date, label: formatDate(point.date), net: Number(point.balance) }
}

export default function PredictionsPage() {
  const [selectedDate, setSelectedDate] = useState('')
  const { data, isLoading, error } = usePredictions(selectedDate || undefined)

  const series = data?.series.map(toMonthlyNet) ?? []

  return (
    <div className="page">
      <h1 className="page-title">Predictions</h1>

      <AsyncState isLoading={isLoading} error={error} />

      {data && (
        <>
          <div className="stat-grid">
            <StatCard
              label="Average salary"
              value={formatCurrency(data.average_salary)}
              tone="positive"
              info="Average amount of past transactions categorized as salary."
            />
            {data.selected && (
              <StatCard
                label={`Balance on ${formatDate(data.selected.date)}`}
                value={formatCurrency(data.selected.balance)}
                tone={Number(data.selected.balance) >= 0 ? 'positive' : 'negative'}
                info="Current balance, plus commitments due by this date and projected salary occurrences up to this date."
              />
            )}
          </div>

          <section className="section">
            <h2 className="section-title">Projected balance — next 5 months</h2>
            <Suspense fallback={<div className="chart-placeholder" />}>
              <BurnRateChart data={series} />
            </Suspense>
          </section>

          <section className="section">
            <h2 className="section-title">Check a specific date</h2>
            <div className="form-card">
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  min={todayISO()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
