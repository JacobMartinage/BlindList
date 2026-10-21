import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { listStorage } from '../utils/listStorage'
import { getApiUrl } from '../config'
import { SiteHeader } from '../components/SiteHeader'

interface VerifiedList {
  name: string;
  creatorToken: string;
  buyerToken: string;
  creatorUrl: string;
  buyerUrl: string;
  createdAt: string;
}

function VerifyEmail() {
  const { token } = useParams<{ token: string }>()
  const [lists, setLists] = useState<VerifiedList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    verifyToken()
  }, [token])

  const verifyToken = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/lists/verify-email/${token}`))

      if (!response.ok) {
        throw new Error('Invalid or expired verification link')
      }

      const data = await response.json()
      setLists(data.lists)

      // Save all lists to localStorage
      data.lists.forEach((list: VerifiedList) => {
        listStorage.saveList({
          name: list.name,
          creatorToken: list.creatorToken,
          buyerToken: list.buyerToken,
          createdAt: list.createdAt
        })
      })
    } catch (err) {
      setError('This verification link is invalid or has expired. Please request a new one.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, token: string) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="font-display text-xl text-muted" role="status">Verifying your email...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-10 pb-16">
          <SiteHeader />
          <section className="panel max-w-xl mt-8" role="alert">
            <div className="panel-head">Verification failed</div>
            <div className="p-6">
              <h1 className="text-3xl font-bold tracking-tight mb-3">That link didn't work</h1>
              <p className="text-ink-soft mb-6">{error}</p>
              <Link to="/find-lists" className="btn btn-accent">
                Request a new link
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-10 pb-16">
        <SiteHeader />

        <div className="pt-8 pb-7">
          <span className="inline-block font-mono text-xs uppercase tracking-[0.08em] px-2.5 py-1 bg-accent border-2 border-ink">
            Email verified
          </span>
          <h1 className="text-4xl sm:text-[52px] leading-[1.05] font-bold tracking-tight mt-4 mb-2">
            Welcome back
          </h1>
          <p className="text-ink-soft">
            Your {lists.length} {lists.length === 1 ? 'list has' : 'lists have'} been saved to this browser.
          </p>
        </div>

        <section className="panel">
          <div className="panel-head">
            <span>Your lists</span>
            <span className="text-muted">{lists.length}</span>
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
                  onClick={() => copyToClipboard(list.buyerUrl, `buyer-${list.buyerToken}`)}
                  className="btn btn-outline btn-sm font-sans font-medium"
                >
                  {copiedToken === `buyer-${list.buyerToken}` ? 'Copied!' : 'Copy buyer link'}
                </button>
                <button
                  onClick={() => copyToClipboard(list.creatorUrl, `creator-${list.creatorToken}`)}
                  className="btn btn-outline btn-sm font-sans font-medium"
                >
                  {copiedToken === `creator-${list.creatorToken}` ? 'Copied!' : 'Copy my link'}
                </button>
              </div>
            </div>
          ))}
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-ink-soft">You can find them again any time under My lists.</p>
          <Link to="/my-lists" className="btn btn-accent">
            Go to My lists
          </Link>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
