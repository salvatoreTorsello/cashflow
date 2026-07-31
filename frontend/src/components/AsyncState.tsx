interface AsyncStateProps {
  isLoading: boolean
  error: unknown
  isEmpty?: boolean
  emptyLabel?: string
}

export default function AsyncState({ isLoading, error, isEmpty, emptyLabel = 'Nothing here yet.' }: AsyncStateProps) {
  if (isLoading) return <p className="async-state">Loading…</p>
  if (error) return <p className="async-state async-state--error">{(error as Error).message ?? 'Something went wrong.'}</p>
  if (isEmpty) return <p className="async-state">{emptyLabel}</p>
  return null
}
