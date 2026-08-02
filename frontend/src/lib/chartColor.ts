/** Fraction (0-1, top to bottom) at which a series crosses zero — splits a gradient at the baseline. */
export function splitOffset(values: number[]): number {
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  if (max <= 0) return 0
  if (min >= 0) return 1
  return max / (max - min)
}
