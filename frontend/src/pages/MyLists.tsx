import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listStorage, SavedList } from '../utils/listStorage'
import { trackEvent } from '../utils/analytics'
import { SiteHeader } from '../components/SiteHeader'

function MyLists() {
  const [lists, setLists] = useState<SavedList[]>([])
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    loadLists()
  }, [])

  const loadLists = () => {
    const savedLists = listStorage.getLists()
    setLists(savedLists)
  }

  const handleRemove = (creatorToken: string) => {
    if (confirm('Remove this list from your saved lists? The list itself will still exist.')) {
      listStorage.removeList(creatorToken)
      loadLists()
    }
  }

  const copyToClipboard = (text: string, token: string) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(token)
    if (token.startsWith('buyer-')) trackEvent('buyer_link_copied')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const getBuyerUrl = (token: string) => {
    return `${window.location.origin}/list/buyer/${token}`
  }

  const getCreatorUrl = (token: string) => {
    return `${window.location.origin}/list/creator/${token}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const findAside = (
    <aside className="flex-[1_1_300px] min-w-0 bg-ink text-ground border-2 border-ink">
      <div className="panel-head border-muted">Find lists by email</div>
      <div className="p-5 flex flex-col gap-3">
        <p className="text-[15px] text-line">
          Used a backup email before? We'll send a link that brings those lists back, on any device.
        </p>
        <a href="/find-lists" className="btn btn-accent !border-accent">
          Send me my lists
        </a>
      </div>
    </aside>
  )

  if (lists.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-10 pb-16">
          <SiteHeader />
          <h1 className="text-4xl sm:text-[52px] leading-[1.05] font-bold tracking-tight pt-8 pb-7">My lists</h1>
          <div className="flex flex-wrap gap-6 items-start">
            <section className="flex-[2_1_520px] min-w-0 panel p-10">
              <p className="text-lg text-ink-soft mb-6">You don't have any saved lists yet.</p>
              <Link to="/" className="btn btn-accent">
                Create your first list
              </Link>
            </section>
            {findAside}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-10 pb-16">
        <SiteHeader />

        <div className="flex flex-wrap items-end justify-between gap-5 pt-8 pb-7">
          <h1 className="text-4xl sm:text-[52px] leading-[1.05] font-bold tracking-tight">My lists</h1>
          <Link to="/" className="btn btn-accent">
            + New list
          </Link>
        </div>

        <div className="flex flex-wrap gap-6 items-start">
          <section className="flex-[2_1_520px] min-w-0 panel">
            <div className="panel-head">
              <span>Saved in this browser</span>
              <span className="text-muted">
                {lists.length} {lists.length === 1 ? 'list' : 'lists'}
              </span>
            </div>
            {lists.map((list) => (
              <div
                key={list.creatorToken}
                className="flex flex-wrap items-center gap-x-5 gap-y-3.5 px-5 py-[18px] border-b border-line"
              >
                <div className="flex-[1_1_220px] min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight break-words">{list.name}</h2>
                  <p className="font-mono text-[13px] text-muted">Created {formatDate(list.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/list/creator/${list.creatorToken}`} className="btn btn-ink btn-sm font-sans font-medium">
                    Open list
                  </Link>
                  <button
                    onClick={() => copyToClipboard(getBuyerUrl(list.buyerToken), `buyer-${list.buyerToken}`)}
                    className="btn btn-outline btn-sm font-sans font-medium"
                  >
                    {copiedToken === `buyer-${list.buyerToken}` ? 'Copied!' : 'Copy buyer link'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(getCreatorUrl(list.creatorToken), `creator-${list.creatorToken}`)}
                    className="btn btn-outline btn-sm font-sans font-medium"
                  >
                    {copiedToken === `creator-${list.creatorToken}` ? 'Copied!' : 'Copy my link'}
                  </button>
                  <button
                    onClick={() => handleRemove(list.creatorToken)}
                    className="btn btn-sm font-sans font-medium border-transparent text-muted hover:text-ink underline"
                    title="Remove from My lists"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <p className="px-5 py-3.5 text-sm text-muted">
              Lists live in this browser only. If you clear browser data or switch devices, you'll
              need your links, or the email backup, to get back in.
            </p>
          </section>
          {findAside}
        </div>
      </div>
    </div>
  )
}

export default MyLists
