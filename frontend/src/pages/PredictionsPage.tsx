import { Suspense, lazy, useState } from 'react'
import { usePredictions } from '../api/hooks'
import { formatCurrency, formatDate } from '../lib/format'
import StatCard from '../components/StatCard'
import AsyncState from '../components/AsyncState'
import type { ForecastPoint } from '../components/BalanceForecastChart'

const BalanceForecastChart = lazy(() => import('../components/BalanceForecastChart'))

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function toForecastPoint(point: { date: string; balance: string }): ForecastPoint {
  return { date: point.date, label: formatDate(point.date), balance: Number(point.balance) }
}

export default function PredictionsPage() {
  const [selectedDate, setSelectedDate] = useState('')
  const { data, isLoading, error } = usePredictions(selectedDate || undefined)

  const series = data?.series.map(toForecastPoint) ?? []
  const selected = data?.selected ? toForecastPoint(data.selected) : null

  return (
    <div className="page">
      <h1 className="page-title">Predictions</h1>

      <AsyncState isLoading={isLoading} error={error} />

      {data && (
        <>
          <div className="stat-grid">
            <StatCard label="Average salary" value={formatCurrency(data.average_salary)} tone="positive" />
            {selected && (
              <StatCard
                label={`Balance on ${formatDate(selected.date)}`}
                value={formatCurrency(selected.balance)}
                tone={selected.balance >= 0 ? 'positive' : 'negative'}
              />
            )}
          </div>

          <section className="section">
            <h2 className="section-title">Projected balance — next 5 months</h2>
            <Suspense fallback={<div className="chart-placeholder" />}>
              <BalanceForecastChart data={series} selected={selected} />
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
