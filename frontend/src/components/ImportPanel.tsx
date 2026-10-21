import { useState } from 'react'
import { getApiUrl } from '../config'
import { trackEvent } from '../utils/analytics'
import { IMPORT_PROMPT, extractItems, ImportCandidate } from '../utils/importPrompt'
import { CreatorItem } from '../types'

interface Props {
  token: string
  onImported: (items: CreatorItem[]) => void
  onClose: () => void
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
}

export function ImportPanel({ token, onImported, onClose }: Props) {
  const [pasted, setPasted] = useState('')
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null)
  const [selected, setSelected] = useState<boolean[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [skipped, setSkipped] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const endpoint = getApiUrl(`/api/lists/creator/${token}/items/import`)

  const copyPrompt = () => {
    navigator.clipboard.writeText(IMPORT_PROMPT)
    setCopied(true)
    trackEvent('import_prompt_copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const post = async (items: unknown[], dryRun: boolean) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, dryRun }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Import failed')
    return data
  }

  const handlePreview = async () => {
    setError('')
    const items = extractItems(pasted)
    if (!items) {
      setError("We couldn't find a list in that. Paste exactly what the chatbot gave you, starting at the { or [.")
      return
    }
    setBusy(true)
    try {
      const data = await post(items, true)
      setCandidates(data.items)
      setSelected(data.items.map(() => true))
      setWarnings(data.warnings || [])
      setSkipped(data.skipped || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirm = async () => {
    if (!candidates) return
    const chosen = candidates.filter((_, i) => selected[i])
    if (chosen.length === 0) return
    setBusy(true)
    setError('')
    try {
      const data = await post(chosen, false)
      trackEvent('import_completed', { item_count: data.items.length })
      onImported(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setBusy(false)
    }
  }

  const chosenCount = selected.filter(Boolean).length

  return (
    <section className="panel mb-8" aria-label="Import a list">
      <div className="panel-head">
        <span>Import a list</span>
        <button onClick={onClose} className="underline normal-case tracking-normal text-sm font-sans hover:text-muted">
          Close
        </button>
      </div>

      {candidates === null ? (
        <div className="p-5 flex flex-col gap-6">
          <div>
            <div className="label-mono mb-2">Step 1</div>
            <p className="text-ink-soft mb-3">
              Copy this prompt, paste it into ChatGPT, Claude or Gemini, and put your list where it
              says <code className="text-sm">[paste your list here]</code>. It can be a Google Doc, notes, an
              email, anything.
            </p>
            <label htmlFor="import-prompt" className="sr-only">Prompt to copy</label>
            <textarea
              id="import-prompt"
              readOnly
              value={IMPORT_PROMPT}
              rows={8}
              className="field font-mono text-[13px] leading-relaxed"
            />
            <button onClick={copyPrompt} className="btn btn-outline btn-sm mt-2.5 font-sans font-medium">
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>

          <div>
            <div className="label-mono mb-2">Step 2</div>
            <label htmlFor="import-paste" className="block text-ink-soft mb-3">
              Paste what the chatbot gives back. You'll see a preview before anything is added.
            </label>
            <textarea
              id="import-paste"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={7}
              className="field font-mono text-[13px]"
              placeholder='{"items":[ ... ]}'
              maxLength={100000}
            />
            {error && (
              <div role="alert" className="mt-3 text-sm text-[#B42318] bg-paper border-2 border-ink p-3">
                {error}
              </div>
            )}
            <button
              onClick={handlePreview}
              disabled={busy || !pasted.trim()}
              className="btn btn-ink mt-3"
            >
              {busy ? 'Checking...' : 'Preview items'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="px-5 py-4 border-b border-line text-ink-soft">
            Found {candidates.length} {candidates.length === 1 ? 'item' : 'items'}
            {skipped > 0 && `, skipped ${skipped} that were empty or duplicates`}. Untick anything you don't want.
          </div>

          {candidates.map((item, i) => (
            <label
              key={`${item.name}-${i}`}
              className="flex items-start gap-3.5 px-5 py-3 border-b border-line cursor-pointer hover:bg-ground"
            >
              <input
                type="checkbox"
                checked={selected[i]}
                onChange={() => setSelected(selected.map((v, j) => (j === i ? !v : v)))}
                className="mt-1.5 w-5 h-5 accent-ink shrink-0"
              />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold break-words">{item.name}</span>
                <span className="block text-sm text-muted break-words">
                  {[item.category, item.description].filter(Boolean).join(' · ')}
                </span>
                {item.url && <span className="block font-mono text-[13px]">{hostOf(item.url)}</span>}
              </span>
              <span className="font-mono text-[15px] shrink-0">{item.price ? `$${item.price.toFixed(2)}` : ''}</span>
            </label>
          ))}

          {warnings.length > 0 && (
            <ul className="px-5 py-3 text-sm text-muted list-disc list-inside border-b border-line">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {error && (
            <div role="alert" className="mx-5 mt-4 text-sm text-[#B42318] bg-paper border-2 border-ink p-3">
              {error}
            </div>
          )}

          <div className="p-5 flex flex-wrap gap-3">
            <button onClick={handleConfirm} disabled={busy || chosenCount === 0} className="btn btn-accent">
              {busy ? 'Adding...' : `Add ${chosenCount} ${chosenCount === 1 ? 'item' : 'items'}`}
            </button>
            <button onClick={() => { setCandidates(null); setError('') }} disabled={busy} className="btn btn-outline">
              Back
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
