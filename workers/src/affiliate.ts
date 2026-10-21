// Amazon Associates link tagging.
//
// Adds the site owner's Associates tag to Amazon product links that do not
// already carry an affiliate tag. A link that already has a non-empty `tag`
// parameter is returned untouched, so a list creator's own tag (or anyone
// else's) is never replaced. Anything that is not a plain http(s) link to an
// Amazon US storefront host is also returned untouched.
//
// This is applied only to the buyer API response; stored URLs are never changed.

// Exact hosts only (no suffix matching), so look-alikes such as
// "amazon.com.evil.site" can never match.
const AMAZON_US_HOSTS = new Set([
  'amazon.com',
  'www.amazon.com',
  'smile.amazon.com',
  'm.amazon.com',
]);

const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export function withAffiliateTag(
  raw: string | null | undefined,
  tag: string | undefined
): string | null {
  if (!raw) return null;

  const cleanTag = (tag ?? '').trim();
  if (!cleanTag || !TAG_PATTERN.test(cleanTag)) return raw;

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }

  if (u.protocol !== 'https:' && u.protocol !== 'http:') return raw;
  if (!AMAZON_US_HOSTS.has(u.hostname.toLowerCase())) return raw;

  // Existing affiliate tag (any casing of the parameter name): leave as is.
  for (const [key, value] of u.searchParams) {
    if (key.toLowerCase() === 'tag' && value.trim() !== '') return raw;
  }

  u.searchParams.set('tag', cleanTag);
  return u.toString();
}

// ---------------------------------------------------------------------------
// Short-link expansion (a.co / amzn.to)
//
// Amazon share links redirect to the real product page, so they can't be tagged
// until we know where they go. SSRF safety: we only ever request hosts on a
// fixed allowlist, never follow redirects automatically, and only continue to
// the next hop if its host is also on the allowlist. A malicious list can't
// point the worker at an internal address because such a URL is never fetched.
// ---------------------------------------------------------------------------

const SHORT_HOSTS = new Set(['a.co', 'amzn.to']);
const MAX_HOPS = 3;
const EXPAND_TIMEOUT_MS = 3000;
const MAX_EXPANSIONS_PER_REQUEST = 10;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export function isAmazonShortLink(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && SHORT_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Follow a short link's redirects (allowlisted hosts only). Returns the Amazon product URL, or null. */
export async function expandAmazonShortLink(
  raw: string,
  fetchFn: FetchLike = fetch,
): Promise<string | null> {
  if (!isAmazonShortLink(raw)) return null;
  let current = raw;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let res: Response;
    try {
      res = await fetchFn(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(EXPAND_TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlindListLinkResolver/1.0)' },
      });
    } catch {
      return null;
    }
    // Drop the body; we only need the Location header.
    try { await res.body?.cancel(); } catch { /* ignore */ }

    if (res.status < 300 || res.status >= 400) return null;
    const location = res.headers.get('location');
    if (!location) return null;

    let next: URL;
    try { next = new URL(location, current); } catch { return null; }
    if (next.protocol !== 'https:') return null;

    const host = next.hostname.toLowerCase();
    if (AMAZON_US_HOSTS.has(host)) return next.toString();
    if (!SHORT_HOSTS.has(host)) return null; // unknown host: stop, never fetch it
    current = next.toString();
  }
  return null;
}

/**
 * Tag every item URL, expanding Amazon short links (cached, capped per request).
 * `cache` is optional (Workers Cache API); failures there never break the response.
 */
export async function tagItemUrls(
  urls: Array<string | null | undefined>,
  tag: string | undefined,
  opts: { fetchFn?: FetchLike; cache?: Cache } = {},
): Promise<Array<string | null>> {
  let budget = MAX_EXPANSIONS_PER_REQUEST;
  return Promise.all(
    urls.map(async (raw) => {
      if (!raw) return null;
      const direct = withAffiliateTag(raw, tag);
      if (direct !== raw) return direct;
      if (!tag || !isAmazonShortLink(raw) || budget <= 0) return raw;
      budget--;

      const cacheKey = new Request(`https://blindlist-shortlinks.internal/?u=${encodeURIComponent(raw)}`);
      let expanded: string | null = null;
      try {
        const hit = await opts.cache?.match(cacheKey);
        if (hit) expanded = (await hit.text()) || null;
      } catch { /* ignore */ }

      if (!expanded) {
        expanded = await expandAmazonShortLink(raw, opts.fetchFn);
        if (expanded) {
          try {
            await opts.cache?.put(
              cacheKey,
              new Response(expanded, { headers: { 'Cache-Control': 'public, max-age=604800' } }),
            );
          } catch { /* ignore */ }
        }
      }
      if (!expanded) return raw;
      // If the destination already carries a tag, withAffiliateTag returns it
      // unchanged; keep the original short link in that case.
      const tagged = withAffiliateTag(expanded, tag);
      return tagged !== expanded ? tagged : raw;
    }),
  );
}
