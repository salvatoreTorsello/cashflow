import type { Transaction } from '../api/types'

export interface MonthlyNet {
  key: string
  label: string
  net: number
}

/** Zero-filled net cash flow for the trailing `months` calendar months (oldest first). */
export function monthlyNetCashFlow(transactions: Transaction[], months = 6): MonthlyNet[] {
  const now = new Date()
  const buckets: MonthlyNet[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString(undefined, { month: 'short' }),
      net: 0,
    })
  }

  const byKey = new Map(buckets.map((b) => [b.key, b]))

  for (const t of transactions) {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = byKey.get(key)
    if (bucket) bucket.net += Number(t.amount)
  }

  return buckets
}
