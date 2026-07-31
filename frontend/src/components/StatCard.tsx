interface StatCardProps {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'negative'
}

export default function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
    </div>
  )
}
