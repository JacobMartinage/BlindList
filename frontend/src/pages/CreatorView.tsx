import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CreatorList, CreatorItem } from '../types'
import { getApiUrl } from '../config'
import { trackEvent } from '../utils/analytics'
import { listStorage } from '../utils/listStorage'
import { SiteHeader } from '../components/SiteHeader'
import { ImportPanel } from '../components/ImportPanel'

function CreatorView() {
  const { token } = useParams<{ token: string }>()
  const [list, setList] = useState<CreatorList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    category: '',
    price: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const [editingItem, setEditingItem] = useState<CreatorItem | null>(null)

  useEffect(() => {
    fetchList()
  }, [token])

  const fetchList = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/lists/creator/${token}`))

      if (!response.ok) {
        throw new Error('List not found')
      }

      const data = await response.json()
      setList(data)
    } catch (err) {
      setError('Failed to load list')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(getApiUrl(`/api/lists/creator/${token}/items`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to add item')
      }

      const newItem = await response.json()
      setList((prev) => prev ? { ...prev, items: [...prev.items, newItem] } : null)
      trackEvent('item_added', { category: formData.category || 'Uncategorized' })
      setFormData({ name: '', description: '', url: '', category: '', price: '' })
      setShowAddForm(false)
      setActiveCategory(null)
    } catch (err) {
      console.error(err)
      alert('Failed to add item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditItem = async (item: CreatorItem) => {
    setSubmitting(true)

    try {
      const response = await fetch(getApiUrl(`/api/lists/creator/${token}/items/${item.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          url: item.url,
          category: item.category,
          price: item.price,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update item')
      }

      const updatedItem = await response.json()
      setList((prev) => prev ? {
        ...prev,
        items: prev.items.map((i) => i.id === updatedItem.id ? updatedItem : i)
      } : null)
      setEditingItem(null)
    } catch (err) {
      console.error(err)
      alert('Failed to update item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      const response = await fetch(getApiUrl(`/api/lists/creator/${token}/items/${itemId}`), {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      setList((prev) => prev ? {
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId)
      } : null)
      trackEvent('item_deleted')
    } catch (err) {
      console.error(err)
      alert('Failed to delete item')
    }
  }

  const handleAddToCategory = (category: string) => {
    const categoryValue = category === 'Uncategorized' ? '' : category
    setFormData({ name: '', description: '', url: '', category: categoryValue, price: '' })
    setActiveCategory(category)
    setShowAddForm(false) // Close the global form if open
  }

  const centered = (text: string, danger = false) => (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className={`font-display text-xl ${danger ? 'text-[#B42318]' : 'text-muted'}`} role={danger ? 'alert' : 'status'}>
        {text}
      </div>
    </div>
  )

  if (loading) return centered('Loading...')
  if (error || !list) return centered(error || 'List not found', true)

  const itemsByCategory = list.items.reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, CreatorItem[]>)

  // Get unique categories for dropdown (excluding empty/uncategorized)
  const existingCategories = Array.from(new Set(
    list.items
      .map(item => item.category)
      .filter((cat): cat is string => cat !== null && cat !== undefined && cat.trim() !== '')
  )).sort()

  const savedList = listStorage.getLists().find((l) => l.creatorToken === token)
  const copyBuyerLink = () => {
    if (!savedList) return
    navigator.clipboard.writeText(`${window.location.origin}/list/buyer/${savedList.buyerToken}`)
    trackEvent('buyer_link_copied')
  }

  const hostOf = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return 'link'
    }
  }

  const renderItemForm = (idPrefix: string, datalistId: string) => (
    <form onSubmit={handleAddItem} className="p-5 flex flex-wrap gap-4 bg-paper">
      <div className="flex-[2_1_260px] flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-name`} className="text-[13px] font-medium">Item name</label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="field !h-[46px]"
          placeholder="Watercolor set, 24 pans"
          required
        />
      </div>
      <div className="flex-[1_1_120px] flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-price`} className="text-[13px] font-medium">Price</label>
        <input
          id={`${idPrefix}-price`}
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          className="field !h-[46px] font-mono"
          placeholder="0.00"
        />
      </div>
      <div className="flex-[1_1_200px] flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-category`} className="text-[13px] font-medium">Category</label>
        <input
          id={`${idPrefix}-category`}
          type="text"
          list={datalistId}
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="field !h-[46px]"
          placeholder="e.g., Books, Gadgets, Clothing"
        />
        <datalist id={datalistId}>
          {existingCategories.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
      </div>
      <div className="flex-[2_1_260px] flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-url`} className="text-[13px] font-medium">Link to product</label>
        <input
          id={`${idPrefix}-url`}
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="field !h-[46px] font-mono text-sm"
          placeholder="https://"
        />
      </div>
      <div className="flex-[3_1_320px] flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-desc`} className="text-[13px] font-medium">Note for buyers</label>
        <input
          id={`${idPrefix}-desc`}
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="field !h-[46px]"
          placeholder="Size, colour or exact model"
        />
      </div>
      <button type="submit" disabled={submitting} className="btn btn-ink !h-[46px] self-end">
        {submitting ? 'Adding...' : 'Add item'}
      </button>
    </form>
  )

  return (
    <div className="min-h-screen">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-10 pb-16">
        <SiteHeader />

        <div className="flex flex-wrap items-end justify-between gap-6 pt-6 pb-7">
          <div className="min-w-0">
            <div className="label-mono mb-3">Creator view · Your list</div>
            <h1 className="text-4xl sm:text-[52px] leading-[1.05] font-bold tracking-tight mb-3.5 break-words">
              {list.name}
            </h1>
            <div className="inline-flex items-center gap-2.5 text-sm text-ink-soft">
              <span className="redact w-11" aria-hidden="true" />
              Claimed status is hidden from you
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {savedList && (
              <button onClick={copyBuyerLink} className="btn btn-outline">
                Copy buyer link
              </button>
            )}
            <button
              onClick={() => {
                setShowImport(!showImport)
                setShowAddForm(false)
                setActiveCategory(null)
                if (!showImport) trackEvent('import_opened')
              }}
              className="btn btn-outline"
            >
              {showImport ? 'Close import' : 'Import list'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm)
                setShowImport(false)
                setActiveCategory(null) // Close any inline category forms
                if (!showAddForm) {
                  setFormData({ name: '', description: '', url: '', category: '', price: '' })
                }
              }}
              className="btn btn-accent"
            >
              {showAddForm ? 'Cancel' : '+ Add item'}
            </button>
          </div>
        </div>

        {showImport && token && (
          <ImportPanel
            token={token}
            onClose={() => setShowImport(false)}
            onImported={(newItems) => {
              setList((prev) => (prev ? { ...prev, items: [...prev.items, ...newItems] } : null))
              setShowImport(false)
            }}
          />
        )}

        {showAddForm && (
          <section className="panel mb-8">
            <div className="panel-head">
              <span>New item</span>
              <span className="text-muted">Paste any store link</span>
            </div>
            {renderItemForm('new', 'categories')}
          </section>
        )}

        <div className="flex flex-col gap-7">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <section key={category} className="panel">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b-2 border-ink">
                <h2 className="text-xl font-semibold tracking-tight">
                  {category}{' '}
                  <span className="font-mono font-normal text-[13px] text-muted">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </h2>
                <button
                  onClick={() => activeCategory === category ? setActiveCategory(null) : handleAddToCategory(category)}
                  className="btn btn-outline btn-sm font-mono font-normal"
                  title={`Add item to ${category}`}
                >
                  {activeCategory === category ? 'Cancel' : '+ Add'}
                </button>
              </div>

              {activeCategory === category && (
                <div className="border-b-2 border-ink">{renderItemForm(`cat-${category}`, 'categories-inline')}</div>
              )}

              {items.map((item) => (
                <div key={item.id} className="border-b border-line last:border-b-0">
                  {editingItem?.id === item.id ? (
                    <div className="p-5 flex flex-col gap-3 bg-ground">
                      <input
                        type="text"
                        aria-label="Item name"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="field"
                      />
                      <textarea
                        aria-label="Note for buyers"
                        value={editingItem.description || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                        className="field"
                        rows={2}
                      />
                      <input
                        type="url"
                        aria-label="Link to product"
                        value={editingItem.url || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                        className="field font-mono text-sm"
                        placeholder="URL"
                      />
                      <input
                        type="text"
                        aria-label="Category"
                        list="categories-edit"
                        value={editingItem.category || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className="field"
                        placeholder="Category"
                      />
                      <datalist id="categories-edit">
                        {existingCategories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                      <input
                        type="number"
                        aria-label="Price"
                        step="0.01"
                        min="0"
                        value={editingItem.price || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value ? parseFloat(e.target.value) : null })}
                        className="field font-mono"
                        placeholder="Price"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditItem(editingItem)}
                          disabled={submitting}
                          className="btn btn-accent"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingItem(null)} className="btn btn-outline">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                      <div className="flex-[1_1_260px] min-w-0">
                        <h3 className="text-[17px] font-semibold font-sans break-words">{item.name}</h3>
                        {item.description && <p className="text-sm text-muted">{item.description}</p>}
                      </div>
                      <div className="flex-[0_0_72px] font-mono text-[15px]">
                        {item.price ? `$${item.price.toFixed(2)}` : ''}
                      </div>
                      <div className="flex-[0_0_150px] font-mono text-[13px]">
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">
                            {hostOf(item.url)} ↗
                          </a>
                        )}
                      </div>
                      <span className="redact w-11 shrink-0" title="Hidden from you" aria-label="Claimed status hidden" />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingItem(item)} className="btn btn-outline btn-sm font-sans font-medium">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="btn btn-outline btn-sm font-sans font-medium">
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}

          {list.items.length === 0 && (
            <div className="panel p-12 text-center">
              <p className="text-muted text-lg">No items yet. Add your first item to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreatorView
