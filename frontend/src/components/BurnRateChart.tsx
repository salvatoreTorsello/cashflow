import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyNet } from '../lib/aggregate'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'

const RADIUS = 4
const BAR_SIZE = 24

// Rounded corner at the bar's far end (away from the zero baseline), square at the baseline —
// so a positive bar rounds at the top and a negative bar rounds at the bottom.
function BurnBar(props: { x?: number; y?: number; width?: number; height?: number; payload?: MonthlyNet }) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props
  const positive = (payload?.net ?? 0) >= 0
  const fill = positive ? 'var(--chart-good)' : 'var(--chart-critical)'
  const r = Math.min(RADIUS, width / 2, height)

  const path = positive
    ? `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
    : `M${x},${y} L${x + width},${y} L${x + width},${y + height - r} Q${x + width},${y + height} ${x + width - r},${y + height} L${x + r},${y + height} Q${x},${y + height} ${x},${y + height - r} Z`

  return <path d={path} fill={fill} />
}

function BarTipLabel(props: { x?: number; y?: number; width?: number; height?: number; payload?: MonthlyNet }) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props
  if (!payload) return null
  const positive = payload.net >= 0
  const labelY = positive ? y - 6 : y + height + 14
  return (
    <text x={x + width / 2} y={labelY} textAnchor="middle" className="chart-bar-label">
      {formatCurrencyCompact(payload.net)}
    </text>
  )
}

function BurnTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: MonthlyNet }> }) {
  if (!active || !payload?.length) return null
  const { label, net } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>
      <span className="chart-tooltip-value">{formatCurrency(net)}</span>
    </div>
  )
}

export default function BurnRateChart({ data }: { data: MonthlyNet[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 28, right: 8, left: 8, bottom: 24 }} barCategoryGap={8}>
        <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
        />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip content={<BurnTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.3 }} />
        <Bar dataKey="net" shape={BurnBar} barSize={BAR_SIZE} label={<BarTipLabel />} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
