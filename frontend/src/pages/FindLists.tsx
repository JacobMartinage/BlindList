import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiUrl } from '../config'
import { SiteHeader } from '../components/SiteHeader'

function FindLists() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(getApiUrl('/api/lists/lookup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to send verification email')
      }

      setSubmitted(true)
    } catch (err) {
      setError('Failed to send email. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-10 pb-16">
          <SiteHeader />
          <section className="panel max-w-xl mt-8" role="status">
            <div className="panel-head">Link sent</div>
            <div className="p-6">
              <h1 className="text-3xl font-bold tracking-tight mb-3">Check your email</h1>
              <p className="text-ink-soft mb-5">
                If there are any lists associated with <strong className="break-all">{email}</strong>, we've
                sent you a magic link to access them.
              </p>
              <p className="text-sm text-muted border-l-2 border-ink pl-3 mb-6">
                The link expires in 1 hour and can only be used once. If you don't receive an email,
                check your spam folder or try again.
              </p>
              <Link to="/" className="btn btn-ink">
                Back to home
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
        <div className="flex flex-wrap gap-6 items-start pt-8">
          <section className="flex-[1_1_420px] max-w-xl min-w-0 panel">
            <div className="panel-head">Find my lists</div>
            <div className="p-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Get back into your lists</h1>
              <p className="text-ink-soft mb-6">
                Enter your email to receive a link to all your BlindLists.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <label htmlFor="email" className="label-mono">Email address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field"
                  disabled={loading}
                  required
                />

                {error && (
                  <div role="alert" className="text-sm text-[#B42318] bg-paper border-2 border-ink p-3">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn btn-accent">
                  {loading ? 'Sending...' : 'Send access link'}
                </button>
              </form>
            </div>
          </section>

          <aside className="flex-[1_1_300px] min-w-0 max-w-md">
            <ol className="space-y-5">
              {[
                'Enter the email you used when creating your lists',
                "We'll send you a magic link (check spam if needed)",
                'Click the link to access all your lists from any device',
              ].map((text, i) => (
                <li key={text} className="border-t-2 border-ink pt-3.5">
                  <div className="font-mono text-sm text-muted mb-1">0{i + 1}</div>
                  <p className="text-ink-soft">{text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-muted">
              This only works for lists where you provided an email. Lists without an associated
              email can only be accessed via their direct links.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default FindLists
