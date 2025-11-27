import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listStorage, SavedList } from '../utils/listStorage'

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

  if (lists.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              to="/"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Back to Home
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">My Lists</h1>
            <p className="text-gray-600 mb-6">
              You don't have any saved lists yet.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Create Your First List
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </Link>
          <Link
            to="/"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            + Create New List
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Lists</h1>
          <p className="text-gray-600">
            {lists.length} {lists.length === 1 ? 'list' : 'lists'} saved on this browser
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {lists.map((list) => (
            <div
              key={list.creatorToken}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {list.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Created {formatDate(list.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(list.creatorToken)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  title="Remove from My Lists"
                >
                  Remove
                </button>
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
                      onClick={() => copyToClipboard(getCreatorUrl(list.creatorToken), `creator-${list.creatorToken}`)}
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
                      value={getBuyerUrl(list.buyerToken)}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-xs"
                    />
                    <button
                      onClick={() => copyToClipboard(getBuyerUrl(list.buyerToken), `buyer-${list.buyerToken}`)}
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

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Lists are saved to this browser only. If you clear browser data or switch devices, you'll need the links to access your lists.
          </p>
        </div>
      </div>
    </div>
  )
}

export default MyLists
