interface StatCardProps {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'negative'
  info?: string
}

export default function StatCard({ label, value, tone = 'default', info }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card-label">
        {label}
        {info && (
          <span className="info-wrap">
            <button type="button" className="info-btn" aria-label={`About ${label}`}>
              i
            </button>
            <span className="info-tooltip" role="tooltip">
              {info}
            </span>
          </span>
        )}
      </span>
      <span className="stat-card-value">{value}</span>
    </div>
  )
}
