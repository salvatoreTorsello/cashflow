import { Suspense, lazy, useState } from 'react'
import { usePredictions } from '../api/hooks'
import type { MonthlyNet } from '../lib/aggregate'
import { formatCurrency, formatDate, todayLocalISO } from '../lib/format'
import StatCard from '../components/StatCard'
import AsyncState from '../components/AsyncState'

const BurnRateChart = lazy(() => import('../components/BurnRateChart'))

function toMonthlyNet(point: { date: string; balance: string }): MonthlyNet {
  return { key: point.date, label: formatDate(point.date), net: Number(point.balance) }
}

export default function PredictionsPage() {
  const [selectedDate, setSelectedDate] = useState('')
  const [salaryMode, setSalaryMode] = useState<'simulated' | 'manual'>('simulated')
  const [manualSalary, setManualSalary] = useState('')

  const averageSalaryOverride =
    salaryMode === 'manual' && manualSalary !== '' ? Number(manualSalary) : undefined

  const { data, isLoading, error } = usePredictions(selectedDate || undefined, averageSalaryOverride)

  const series = data?.series.map(toMonthlyNet) ?? []

  return (
    <div className="page">
      <h1 className="page-title">Predictions</h1>

      <section className="section">
        <h2 className="section-title">Average salary</h2>
        <div className="tabs">
          <button
            type="button"
            className={`tab${salaryMode === 'simulated' ? ' active' : ''}`}
            onClick={() => setSalaryMode('simulated')}
          >
            Simulated (average of previous)
          </button>
          <button
            type="button"
            className={`tab${salaryMode === 'manual' ? ' active' : ''}`}
            onClick={() => setSalaryMode('manual')}
          >
            Manual
          </button>
        </div>
        {salaryMode === 'manual' && (
          <div className="form-card">
            <label className="field">
              <span>Average salary to use in predictions</span>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 2400"
                value={manualSalary}
                onChange={(e) => setManualSalary(e.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      <AsyncState isLoading={isLoading} error={error} />

      {data && (
        <>
          <div className="stat-grid">
            <StatCard
              label="Average salary"
              value={formatCurrency(data.average_salary)}
              tone="positive"
              info={
                salaryMode === 'manual' && averageSalaryOverride !== undefined
                  ? 'The manual value you entered above, used in place of the calculated average.'
                  : 'Average amount of past transactions categorized as salary.'
              }
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
                  min={todayLocalISO()}
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
