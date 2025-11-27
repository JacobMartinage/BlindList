import { useState } from 'react'
import { listStorage } from '../utils/listStorage'
import { getApiUrl } from '../config'

function LandingPage() {
  const [listName, setListName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ creatorUrl: string; buyerUrl: string } | null>(null)
  const [error, setError] = useState('')
  const [savedListName, setSavedListName] = useState('')
  const [email, setEmail] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!listName.trim()) {
      setError('Please enter a list name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(getApiUrl('/api/lists'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: listName }),
      })

      if (!response.ok) {
        throw new Error('Failed to create list')
      }

      const data = await response.json()
      setResult(data)
      setSavedListName(listName)

      // Save to localStorage
      const creatorToken = data.creatorUrl.split('/').pop() || ''
      const buyerToken = data.buyerUrl.split('/').pop() || ''
      listStorage.saveList({
        name: listName,
        creatorToken,
        buyerToken,
        createdAt: new Date().toISOString()
      })
    } catch (err) {
      setError('Failed to create list. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !email.includes('@')) {
      return
    }

    setEmailSubmitting(true)

    try {
      const creatorToken = result?.creatorUrl.split('/').pop() || ''
      const response = await fetch(getApiUrl(`/api/lists/${creatorToken}/associate-email`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to associate email')
      }

      setEmailSuccess(true)
    } catch (err) {
      console.error(err)
      alert('Failed to send email. You can still access your list via the links above.')
    } finally {
      setEmailSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              List Created Successfully!
            </h1>
            <p className="text-gray-600 mb-3">
              Your list has been saved to this browser
            </p>
            <p className="text-sm text-gray-500">
              You can access "{savedListName}" anytime from "My Lists"
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Creator Link (for you)
              </h2>
              <p className="text-sm text-blue-700 mb-3">
                Use this to add and edit items. You won't see what's been purchased.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={result.creatorUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm"
                />
                <button
                  onClick={() => copyToClipboard(result.creatorUrl)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-2">
                Buyer Link (share this)
              </h2>
              <p className="text-sm text-green-700 mb-3">
                Share this with friends and family so they can mark items as purchased.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={result.buyerUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm"
                />
                <button
                  onClick={() => copyToClipboard(result.buyerUrl)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {!emailSuccess ? (
            <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="font-semibold text-purple-900 mb-2">
                Want cross-device access?
              </h3>
              <p className="text-sm text-purple-700 mb-4">
                Optionally provide your email to access this list from any device. We'll send you a confirmation email with your links.
              </p>
              <form onSubmit={handleEmailSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  disabled={emailSubmitting}
                />
                <button
                  type="submit"
                  disabled={emailSubmitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {emailSubmitting ? 'Sending...' : 'Send Email'}
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 text-green-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-medium">
                  Email sent! Check your inbox for a confirmation with your list links.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <a
              href={result.creatorUrl}
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Go to Your List
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <a
            href="/find-lists"
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
          >
            Find My Lists
          </a>
          <a
            href="/my-lists"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            My Lists {listStorage.getCount() > 0 && `(${listStorage.getCount()})`}
          </a>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            BlindList
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Create a shareable wishlist where buyers can mark items as purchased
          </p>
          <p className="text-lg text-gray-700 font-medium">
            — but the list creator stays completely blind to what was bought.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Create Your List
          </h2>

          <form onSubmit={handleCreateList} className="space-y-6">
            <div>
              <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-2">
                List Name
              </label>
              <input
                type="text"
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., Jacob's Christmas 2025"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create List'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">How it works:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-indigo-600 font-bold mr-2">1.</span>
                <span>Create a list and add your wishlist items</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 font-bold mr-2">2.</span>
                <span>Share the buyer link with friends and family</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 font-bold mr-2">3.</span>
                <span>They can mark items as purchased to avoid duplicates</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 font-bold mr-2">4.</span>
                <span>You stay blind to which items were claimed - keep the surprise!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
