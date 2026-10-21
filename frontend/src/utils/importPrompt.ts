// The prompt people paste into ChatGPT, Claude or Gemini, and the helper that
// pulls JSON out of whatever the chatbot sends back. The server re-validates
// everything, so this file only has to be forgiving, never trusted.

export const IMPORT_PROMPT = `I'm making a gift wishlist on BlindList. Turn my list below into JSON, using exactly this format and nothing else (no explanation, no markdown):

{"items":[{"name":"Item name","category":"Books","price":19.99,"url":"https://example.com/item","description":"Size, colour or other note"}]}

Rules:
- One object per item. Keep my own wording for item names.
- Use null for anything that isn't in my list. Do not guess prices and do not invent links.
- Group similar items under short, consistent category names (for example Books, Kitchen, Clothing).
- Put sizes, colours and other details in "description".
- Output only the JSON.

My list:
[paste your list here]`

export interface ImportCandidate {
  name: string
  description: string | null
  url: string | null
  category: string | null
  price: number | null
}

/** Finds the items array in pasted chatbot output (handles code fences and chatter). */
export function extractItems(text: string): unknown[] | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const attempts: string[] = [trimmed]
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) attempts.push(trimmed.slice(firstBrace, lastBrace + 1))
  const firstBracket = trimmed.indexOf('[')
  const lastBracket = trimmed.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) attempts.push(trimmed.slice(firstBracket, lastBracket + 1))

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)) {
        return (parsed as { items: unknown[] }).items
      }
    } catch {
      // try the next shape
    }
  }
  return null
}
