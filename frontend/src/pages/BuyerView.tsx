import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { BuyerList, BuyerItem } from '../types'
import { getApiUrl } from '../config'
import { trackEvent } from '../utils/analytics'
import { Logo } from '../components/SiteHeader'

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
      trackEvent('buyer_view', { item_count: Array.isArray(data.items) ? data.items.length : 0 })
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
  }, {} as Record<string, BuyerItem[]>)

  const purchasedCount = list.items.filter(item => item.purchased).length
  const categories = Object.entries(itemsByCategory)
  const categoryId = (name: string) => `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div className="min-h-screen">
      <div className="max-w-[1160px] mx-auto px-4 sm:px-10 pb-16">
        <header className="py-5 sm:py-7">
          <Logo />
        </header>

        <div className="flex flex-wrap items-end justify-between gap-6 sm:gap-8 pt-4 sm:pt-6 pb-8">
          <div className="min-w-0">
            <div className="label-mono mb-2 sm:mb-3">You're shopping for</div>
            <h1 className="text-[38px] sm:text-[52px] leading-[1.05] font-bold tracking-tight break-words">
              {list.name}
            </h1>
          </div>
          {list.items.length > 0 && (
            <div className="flex-[0_1_340px] min-w-[240px] w-full sm:w-auto">
              <div className="flex justify-between font-mono text-[13px] mb-2">
                <span>{purchasedCount} of {list.items.length} claimed</span>
                <span className="text-muted">{list.items.length - purchasedCount} left</span>
              </div>
              <div className="flex gap-1" aria-hidden="true">
                {list.items.map((item, i) => (
                  <span
                    key={item.id}
                    className={`flex-1 h-3 border-2 border-ink ${i < purchasedCount ? 'bg-accent' : 'bg-paper'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mb-7 px-4 py-3.5 bg-ink text-ground text-[15px]">
          Tap a row when you've bought it so nobody else does. The list owner can't see what you mark.
        </p>

        {categories.length > 1 && (
          <nav
            aria-label="Jump to a category"
            className="sm:hidden sticky top-0 z-10 -mx-4 mb-5 px-4 py-2.5 bg-ground border-y-2 border-ink flex gap-2 overflow-x-auto"
          >
            <span className="shrink-0 self-center label-mono !text-[11px]">Jump to</span>
            {categories.map(([category, items]) => {
              const left = items.filter((i) => !i.purchased).length
              return (
                <a
                  key={category}
                  href={`#${categoryId(category)}`}
                  className="shrink-0 inline-flex items-center gap-2 h-10 px-3.5 bg-paper border-2 border-ink no-underline font-semibold text-sm hover:text-ink"
                >
                  {category}
                  <span className="font-mono font-normal text-xs text-muted">{left === 0 ? 'done' : `${left} left`}</span>
                </a>
              )
            })}
          </nav>
        )}

        <div className="[column-width:460px] [column-gap:28px]">
          {categories.map(([category, items]) => (
            <section
              key={category}
              id={categoryId(category)}
              className="panel break-inside-avoid mb-5 sm:mb-7 scroll-mt-[72px]"
            >
              <h2 className="px-4 sm:px-5 py-2.5 sm:py-3 border-b-2 border-ink text-lg sm:text-xl font-semibold tracking-tight">
                {category}
              </h2>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 border-b border-line last:border-b-0 ${
                    item.purchased ? 'bg-[#EFEEE8]' : 'bg-paper'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleTogglePurchased(item.id)}
                    disabled={toggling === item.id}
                    aria-pressed={item.purchased}
                    aria-label={`${item.purchased ? 'Unmark' : 'Mark as bought:'} ${item.name}`}
                    className={`shrink-0 w-11 h-11 inline-flex items-center justify-center border-2 border-ink cursor-pointer disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                      item.purchased ? 'bg-ink' : 'bg-paper hover:bg-ground'
                    }`}
                  >
                    {toggling === item.id ? (
                      <span className="font-mono text-ground text-sm">...</span>
                    ) : item.purchased ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F2F1EC" strokeWidth="3" strokeLinecap="square" aria-hidden="true">
                        <path d="M4 12.5l5 5L20 6.5" />
                      </svg>
                    ) : null}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-sans text-base sm:text-[17px] font-semibold break-words ${item.purchased ? 'line-through text-muted' : ''}`}>
                      {item.name}
                    </h3>
                    {item.description && <p className="text-sm text-muted">{item.description}</p>}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        onClick={() => trackEvent('product_click', { affiliate: /[?&]tag=/.test(item.url || '') })}
                        className="inline-block mt-1 py-1 font-mono text-[13px] underline"
                      >
                        View product ↗
                      </a>
                    )}
                  </div>
                  {item.price != null && (
                    <div className={`shrink-0 font-mono text-[15px] ${item.purchased ? 'text-muted' : ''}`}>
                      ${item.price.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}

          {list.items.length === 0 && (
            <div className="panel p-12 text-center">
              <p className="text-muted text-lg">This list doesn't have any items yet.</p>
            </div>
          )}
        </div>

        <div className="mt-9 flex flex-wrap justify-between items-baseline gap-4 text-sm text-ink-soft">
          <span>
            Want one for your own birthday, wedding or baby shower?{' '}
            <a href="/?ref=buyer" onClick={() => trackEvent('buyer_cta_click')} className="underline">
              Make your own blind list
            </a>
          </span>
          {list.hasAffiliateLinks && (
            <span className="text-muted">As an Amazon Associate I earn from qualifying purchases.</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default BuyerView
