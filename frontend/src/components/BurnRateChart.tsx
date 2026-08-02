import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyNet } from '../lib/aggregate'
import { splitOffset } from '../lib/chartColor'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'
import SignDot from './SignDot'

function BurnTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: MonthlyNet }> }) {
  if (!active || !payload?.length) return null
  const { label, net } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>
      <span
        className="chart-tooltip-value"
        style={{ color: net >= 0 ? 'var(--chart-good)' : 'var(--chart-critical)' }}
      >
        {formatCurrency(net)}
      </span>
    </div>
  )
}

export default function BurnRateChart({ data }: { data: MonthlyNet[] }) {
  const offset = splitOffset(data.map((d) => d.net))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="burnStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset={offset} stopColor="var(--chart-good)" stopOpacity={1} />
            <stop offset={offset} stopColor="var(--chart-critical)" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} stopColor="var(--chart-good)" stopOpacity={0.35} />
            <stop offset={offset} stopColor="var(--chart-good)" stopOpacity={0} />
            <stop offset={offset} stopColor="var(--chart-critical)" stopOpacity={0} />
            <stop offset={1} stopColor="var(--chart-critical)" stopOpacity={0.35} />
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
        <YAxis
          axisLine={false}
          tickLine={false}
          width={60}
          domain={['auto', 'auto']}
          tickFormatter={(value: number) => formatCurrencyCompact(value)}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
        />
        <Tooltip content={<BurnTooltip />} cursor={{ stroke: 'var(--color-border)' }} />
        <Area
          type="monotone"
          dataKey="net"
          stroke="url(#burnStroke)"
          strokeWidth={2}
          fill="url(#burnFill)"
          dot={<SignDot />}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
