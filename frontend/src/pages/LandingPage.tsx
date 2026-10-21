import { useState } from 'react'
import { listStorage } from '../utils/listStorage'
import { getApiUrl } from '../config'
import { trackEvent } from '../utils/analytics'
import { SiteHeader, SiteFooter } from '../components/SiteHeader'

const DEMO_ROWS = [
  { name: 'Wild Robot, hardcover', claimed: true, bar: 72 },
  { name: 'Watercolor set, 24 pans', claimed: false, bar: 54 },
  { name: "Kids' binoculars", claimed: true, bar: 64 },
  { name: 'Rain boots, size 3', claimed: false, bar: 48 },
]

const STEPS = [
  { n: '01', title: 'Make the list', body: 'Add anything with a link from any store, plus a price and a note. This is your creator link, and only you use it.' },
  { n: '02', title: 'Share the buyer link', body: "Send it to everyone who might buy something. They don't need an account either." },
  { n: '03', title: 'They claim, you wait', body: 'Buyers mark what they bought so nobody doubles up. You can edit the list, but you never see what was claimed.' },
]

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
      trackEvent('list_created')

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
      trackEvent('email_submitted')
    } catch (err) {
      console.error(err)
      alert('Failed to send email. You can still access your list via the links above.')
    } finally {
      setEmailSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-10">
          <SiteHeader />

          <div className="pt-10 pb-9">
            <span className="inline-block font-mono text-xs uppercase tracking-[0.08em] px-2.5 py-1 bg-accent border-2 border-ink">
              List created
            </span>
            <h1 className="text-4xl sm:text-[56px] leading-[1.05] font-bold tracking-tight mt-4 mb-3 break-words">
              {savedListName}
            </h1>
            <p className="text-ink-soft max-w-xl">
              Saved in this browser. You can find it again any time under My lists.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex-[2_1_520px] min-w-0 flex flex-col gap-6">
              <section className="panel">
                <div className="panel-head">
                  <span>Your link</span>
                  <span className="text-muted">Keep private</span>
                </div>
                <div className="p-5">
                  <p className="mb-3.5 text-ink-soft">
                    Add and edit items here. You won't see what gets claimed.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <label htmlFor="creatorUrl" className="sr-only">Creator link</label>
                    <input
                      id="creatorUrl"
                      type="text"
                      value={result.creatorUrl}
                      readOnly
                      className="field flex-1 min-w-[220px] font-mono text-sm"
                    />
                    <button onClick={() => copyToClipboard(result.creatorUrl)} className="btn btn-outline">
                      Copy
                    </button>
                    <a href={result.creatorUrl} className="btn btn-accent">
                      Add items →
                    </a>
                  </div>
                </div>
              </section>

              <section className="bg-ink text-ground border-2 border-ink">
                <div className="panel-head border-muted">
                  <span>Share this link</span>
                  <span className="text-line">For buyers</span>
                </div>
                <div className="p-5">
                  <p className="mb-3.5 text-line">
                    Send this to family and friends. They can mark items as bought without an account.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <label htmlFor="buyerUrl" className="sr-only">Buyer link</label>
                    <input
                      id="buyerUrl"
                      type="text"
                      value={result.buyerUrl}
                      readOnly
                      className="field flex-1 min-w-[220px] font-mono text-sm !bg-[#1B1B1F] !text-ground !border-[#8A8A90] focus:ring-offset-ink"
                    />
                    <button
                      onClick={() => copyToClipboard(result.buyerUrl)}
                      className="btn btn-accent !border-accent"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="flex-[1_1_300px] min-w-0 panel">
              <div className="panel-head">Optional backup</div>
              {!emailSuccess ? (
                <form onSubmit={handleEmailSubmit} className="p-5 flex flex-col gap-3">
                  <p className="text-[15px] text-ink-soft">
                    Lose your browser data and you lose the links. Email them to yourself so you can
                    always get back in, from any device.
                  </p>
                  <label htmlFor="backupEmail" className="label-mono">Your email</label>
                  <input
                    id="backupEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="field"
                    disabled={emailSubmitting}
                  />
                  <button type="submit" disabled={emailSubmitting} className="btn btn-ink">
                    {emailSubmitting ? 'Sending...' : 'Email me the links'}
                  </button>
                  <p className="text-[13px] text-muted">We use it only to send your links.</p>
                </form>
              ) : (
                <div className="p-5 flex items-start gap-2.5" role="status">
                  <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="square" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-medium">
                    Email sent! Check your inbox for a confirmation with your list links.
                  </p>
                </div>
              )}
            </aside>
          </div>

          <SiteFooter />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-10">
        <SiteHeader />

        <section className="flex flex-wrap gap-14 items-center pt-10 pb-16 md:pt-14 md:pb-24">
          <div className="flex-[1_1_460px] min-w-0">
            <div className="label-mono mb-5 !text-[13px]">Gift lists with a blind spot</div>
            <h1 className="text-5xl md:text-[68px] leading-none font-bold tracking-[-0.035em] mb-6">
              Everyone can see what's taken. Except you.
            </h1>
            <p className="text-xl text-ink-soft mb-9 max-w-[520px]">
              Make a list, send one link, and let family and friends mark what they buy. Nothing
              gets bought twice, and the surprise stays whole.
            </p>

            <form onSubmit={handleCreateList} className="flex flex-wrap gap-3 max-w-[560px]">
              <div className="flex-[1_1_260px] flex flex-col gap-1.5">
                <label htmlFor="listName" className="label-mono">Name your list</label>
                <input
                  type="text"
                  id="listName"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Mia's 8th birthday"
                  className="field !h-14 text-lg bg-paper"
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-accent !h-14 text-lg self-end">
                {loading ? 'Creating...' : 'Create list'}
              </button>
              {error && (
                <div role="alert" className="basis-full text-sm text-[#B42318] bg-paper border-2 border-ink p-3">
                  {error}
                </div>
              )}
            </form>
            <p className="text-sm text-muted mt-3.5">
              Free. No account. Saved in this browser, with an optional email backup.
            </p>
          </div>

          <div className="flex-[1_1_400px] min-w-0 flex flex-col gap-5">
            <div className="panel">
              <div className="panel-head">
                <span>What you see</span>
                <span className="text-muted normal-case tracking-normal">Mia's 8th birthday</span>
              </div>
              {DEMO_ROWS.map((r) => (
                <div key={r.name} className="flex items-center justify-between gap-3 px-[18px] py-3 border-b border-line">
                  <span className="font-medium">{r.name}</span>
                  <span className="redact" style={{ width: r.bar }} aria-hidden="true" />
                </div>
              ))}
              <div className="px-[18px] py-3 text-sm text-muted">Claimed items stay hidden from you.</div>
            </div>

            <div className="bg-ink text-ground border-2 border-ink">
              <div className="panel-head border-muted">
                <span>What they see</span>
                <span className="text-line">Buyer link</span>
              </div>
              {DEMO_ROWS.map((r) => (
                <div key={r.name} className="flex items-center justify-between gap-3 px-[18px] py-3 border-b border-ink-soft">
                  <span className={`font-medium ${r.claimed ? 'line-through text-[#A5A49E]' : ''}`}>{r.name}</span>
                  <span
                    className={`font-mono text-xs tracking-wide px-2 py-[3px] border ${
                      r.claimed ? 'bg-accent border-accent text-ink' : 'border-[#8A8A90]'
                    }`}
                  >
                    {r.claimed ? 'CLAIMED' : 'OPEN'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="border-y-2 border-ink bg-paper">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-10 py-16 md:py-[72px]">
          <h2 className="text-4xl font-bold tracking-tight mb-10">Two links. Two views.</h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t-2 border-ink pt-[18px]">
                <div className="font-mono text-sm text-muted mb-2.5">{s.n}</div>
                <h3 className="text-[22px] font-semibold tracking-tight mb-2">{s.title}</h3>
                <p className="text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-[1160px] mx-auto px-5 sm:px-10">
        <SiteFooter />
      </div>
    </div>
  )
}

export default LandingPage
