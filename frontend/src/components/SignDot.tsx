export default function SignDot({ cx, cy, value }: { cx?: number; cy?: number; value?: number }) {
  if (cx === undefined || cy === undefined || value === undefined) return null
  const positive = value >= 0
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      stroke={positive ? 'var(--chart-good)' : 'var(--chart-critical)'}
      strokeWidth={2}
      fill="var(--color-surface)"
    />
  )
}
