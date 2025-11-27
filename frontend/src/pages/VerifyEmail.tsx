import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { listStorage } from '../utils/listStorage'

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
      const response = await fetch(`/api/lists/verify-email/${token}`)

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-xl text-gray-600">Verifying your email...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/find-lists"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Verified!</h1>
              <p className="text-gray-600">
                Your {lists.length} {lists.length === 1 ? 'list has' : 'lists have'} been saved to this browser
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {lists.map((list) => (
            <div
              key={list.creatorToken}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {list.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Created {formatDate(list.createdAt)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    Your Creator Link
                  </h3>
                  <div className="flex gap-2">
                    <Link
                      to={`/list/creator/${list.creatorToken}`}
                      className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm text-blue-600 hover:bg-blue-50 transition-colors text-center"
                    >
                      Open List
                    </Link>
                    <button
                      onClick={() => copyToClipboard(list.creatorUrl, `creator-${list.creatorToken}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      {copiedToken === `creator-${list.creatorToken}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 mb-2">
                    Buyer Link (share this)
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={list.buyerUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-xs"
                    />
                    <button
                      onClick={() => copyToClipboard(list.buyerUrl, `buyer-${list.buyerToken}`)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    >
                      {copiedToken === `buyer-${list.buyerToken}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-800 mb-4">
            All lists have been saved to this browser. You can access them anytime from "My Lists".
          </p>
          <Link
            to="/my-lists"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Go to My Lists
          </Link>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
