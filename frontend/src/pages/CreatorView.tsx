import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CreatorList, CreatorItem } from '../types'

function CreatorView() {
  const { token } = useParams<{ token: string }>()
  const [list, setList] = useState<CreatorList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
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
      const response = await fetch(`/api/lists/creator/${token}`)

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
      const response = await fetch(`/api/lists/creator/${token}/items`, {
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
      setFormData({ name: '', description: '', url: '', category: '', price: '' })
      setShowAddForm(false)
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
      const response = await fetch(`/api/lists/creator/${token}/items/${item.id}`, {
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
      const response = await fetch(`/api/lists/creator/${token}/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      setList((prev) => prev ? {
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId)
      } : null)
    } catch (err) {
      console.error(err)
      alert('Failed to delete item')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error || !list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{error || 'List not found'}</div>
      </div>
    )
  }

  const itemsByCategory = list.items.reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, CreatorItem[]>)

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <a href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
            ← Home
          </a>
          <a href="/my-lists" className="text-indigo-600 hover:text-indigo-800 font-medium">
            My Lists
          </a>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{list.name}</h1>
              <p className="text-sm text-gray-500 mt-1">Creator View - Purchase status is hidden</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {showAddForm ? 'Cancel' : '+ Add Item'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddItem} className="mb-6 p-6 bg-gray-50 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL (link to product)
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="e.g., Books, Gadgets, Clothing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="0.00"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Item'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-6">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{category}</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    {editingItem?.id === item.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingItem.name}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <textarea
                          value={editingItem.description || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={2}
                        />
                        <input
                          type="url"
                          value={editingItem.url || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="URL"
                        />
                        <input
                          type="text"
                          value={editingItem.category || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Category"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingItem.price || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Price"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditItem(editingItem)}
                            disabled={submitting}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            {item.price && (
                              <p className="text-green-600 font-medium text-sm mt-1">
                                ${item.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 text-sm"
                          >
                            View Product →
                          </a>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {list.items.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <p className="text-gray-500 text-lg">No items yet. Add your first item to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreatorView
