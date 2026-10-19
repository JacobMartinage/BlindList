import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { BuyerList, BuyerItem } from '../types'
import { getApiUrl } from '../config'
import { trackEvent } from '../utils/analytics'

function BuyerView() {
  const { token } = useParams<{ token: string }>()
  const [list, setList] = useState<BuyerList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    fetchList()
  }, [token])

  const fetchList = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/lists/buyer/${token}`))

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

  const handleTogglePurchased = async (itemId: string) => {
    // Find the item to check its current purchased status
    const item = list?.items.find(i => i.id === itemId)

    // If item is already purchased and user is trying to untoggle it, show confirmation
    if (item?.purchased) {
      const confirmed = confirm('Are you sure you want to unmark this item as purchased?')
      if (!confirmed) {
        return
      }
    }

    setToggling(itemId)

    try {
      const response = await fetch(getApiUrl(`/api/lists/buyer/${token}/items/${itemId}/toggle-purchased`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to toggle purchased status')
      }

      const updatedItem = await response.json()
      trackEvent(updatedItem.purchased ? 'item_purchased' : 'item_unpurchased')
      setList((prev) => prev ? {
        ...prev,
        items: prev.items.map((item) =>
          item.id === updatedItem.id ? { ...item, purchased: updatedItem.purchased } : item
        )
      } : null)
    } catch (err) {
      console.error(err)
      alert('Failed to update item')
    } finally {
      setToggling(null)
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
  }, {} as Record<string, BuyerItem[]>)

  const purchasedCount = list.items.filter(item => item.purchased).length

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <a href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
            ← Home
          </a>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{list.name}</h1>
          <p className="text-sm text-gray-500 mb-4">Buyer View - You can see and claim items</p>

          <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-700">
              <p className="text-sm font-medium">
                {purchasedCount} of {list.items.length} items marked as purchased
              </p>
              <p className="text-xs mt-1">
                Click on items to mark/unmark them as purchased. The list creator won't see your selections.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl shadow-lg p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">{category}</h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTogglePurchased(item.id)}
                    disabled={toggling === item.id}
                    className={`w-full text-left border-2 rounded-lg p-2.5 transition-all ${
                      item.purchased
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    } disabled:opacity-50`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className={`text-sm font-semibold ${
                          item.purchased ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>
                          {item.name}
                        </h3>
                        {item.price && (
                          <p className={`font-medium text-xs mt-0.5 ${
                            item.purchased ? 'text-gray-400' : 'text-green-600'
                          }`}>
                            ${item.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-1 ${
                        item.purchased
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {toggling === item.id
                          ? '...'
                          : item.purchased
                          ? 'Purchased'
                          : 'Available'
                        }
                      </span>
                    </div>

                    {item.description && (
                      <p className={`text-xs mb-1 ${
                        item.purchased ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {item.description}
                      </p>
                    )}

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs inline-flex items-center gap-1 ${
                          item.purchased
                            ? 'text-gray-400 hover:text-gray-600'
                            : 'text-indigo-600 hover:text-indigo-800'
                        }`}
                      >
                        View Product →
                      </a>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {list.items.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <p className="text-gray-500 text-lg">This list doesn't have any items yet.</p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">How to use this list:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-indigo-600 mr-2">•</span>
              <span>Click on any item to mark it as purchased</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 mr-2">•</span>
              <span>Click again to unmark it if you change your mind</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 mr-2">•</span>
              <span>The list creator cannot see which items you've marked</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-600 mr-2">•</span>
              <span>This helps prevent duplicate gifts!</span>
            </li>
          </ul>
        </div>

        {list.hasAffiliateLinks && (
          <p className="mt-4 text-center text-xs text-gray-500">
            As an Amazon Associate I earn from qualifying purchases.
          </p>
        )}
      </div>
    </div>
  )
}

export default BuyerView
