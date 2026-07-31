import { useState, type FormEvent } from 'react'
import { useCategories, useCreateCategory } from '../api/hooks'
import AsyncState from '../components/AsyncState'

export default function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories()
  const createCategory = useCreateCategory()
  const [name, setName] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    createCategory.mutate({ name: trimmed }, { onSuccess: () => setName('') })
  }

  return (
    <div className="page">
      <h1 className="page-title">Categories</h1>

      <form className="form-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>New category</span>
          <input
            type="text"
            placeholder="e.g. car"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        {createCategory.isError && (
          <p className="async-state async-state--error">{(createCategory.error as Error).message}</p>
        )}

        <button className="btn-primary" type="submit" disabled={createCategory.isPending}>
          {createCategory.isPending ? 'Adding…' : 'Add category'}
        </button>
      </form>

      <section className="section">
        <AsyncState isLoading={isLoading} error={error} isEmpty={categories?.length === 0} emptyLabel="No categories yet." />
        <div className="chip-list">
          {categories?.map((c) => (
            <span className="chip" key={c.id}>
              {c.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
