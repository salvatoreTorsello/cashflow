import { Area, AreaChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency, formatDate } from '../lib/format'

export interface ForecastPoint {
  date: string
  label: string
  balance: number
}

function ForecastTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ForecastPoint }> }) {
  if (!active || !payload?.length) return null
  const { date, balance } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{formatDate(date)}</span>
      <span className="chart-tooltip-value">{formatCurrency(balance)}</span>
    </div>
  )
}

export default function BalanceForecastChart({
  data,
  selected,
}: {
  data: ForecastPoint[]
  selected?: ForecastPoint | null
}) {
  const negative = data.some((p) => p.balance < 0)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          minTickGap={24}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
        />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip content={<ForecastTooltip />} cursor={{ stroke: 'var(--color-border)' }} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={negative ? 'var(--chart-critical)' : 'var(--chart-good)'}
          strokeWidth={2}
          fill="url(#forecastFill)"
          isAnimationActive={false}
        />
        {selected && (
          <ReferenceDot
            x={selected.label}
            y={selected.balance}
            r={5}
            fill="var(--color-accent)"
            stroke="var(--color-surface)"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
