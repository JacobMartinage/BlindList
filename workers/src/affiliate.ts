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
