export function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(Number(value))
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}
