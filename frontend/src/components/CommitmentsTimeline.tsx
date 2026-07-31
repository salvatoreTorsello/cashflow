import type { Commitment } from '../api/types'
import { formatCurrency, formatDate } from '../lib/format'

export default function CommitmentsTimeline({ commitments }: { commitments: Commitment[] }) {
  if (commitments.length === 0) {
    return <p className="async-state">No upcoming commitments.</p>
  }

  return (
    <ol className="timeline">
      {commitments.map((c) => (
        <li className="timeline-item" key={c.id}>
          <span className="timeline-dot" aria-hidden="true" />
          <div className="timeline-content">
            <div className="timeline-header">
              <span className="timeline-date">{formatDate(c.due_date)}</span>
              <span className="list-card-amount negative">{formatCurrency(c.amount)}</span>
            </div>
            <span className="list-card-title">{c.description ?? c.category.name}</span>
            <span className="list-card-subtitle">{c.category.name}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
