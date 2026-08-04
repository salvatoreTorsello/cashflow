export function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(Number(value))
}

export function formatCurrencyCompact(value: string | number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value))
}

// `new Date("2026-08-28")` (date-only, no time) is parsed as UTC midnight
// per spec, which can shift the displayed calendar day by one depending on
// the browser's timezone offset. Appending a time with no zone/offset forces
// local-midnight parsing instead, matching what a plain "YYYY-MM-DD" value
// (no timezone concept at all) actually means.
export function parseLocalDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

// The inverse: format a Date back to "YYYY-MM-DD" using its local calendar
// fields. Date.toISOString() converts to UTC first, which shifts the date
// for part of the day in any timezone not equal to UTC — e.g. just after
// midnight in a timezone ahead of UTC, toISOString() still reports "yesterday".
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayLocalISO(): string {
  return toLocalDateString(new Date())
}

export function formatDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}
