// Strict validation for list imports and item links.
//
// Imported JSON comes from whatever the user pasted, so it is treated as
// untrusted input: we never trust its shape, size or contents. Everything that
// reaches the database goes through the functions in this file.

export const LIMITS = {
  maxItemsPerImport: 100,
  maxItemsPerList: 300,
  maxBodyBytes: 100_000,
  name: 200,
  description: 500,
  category: 60,
  url: 2000,
  maxPrice: 100_000,
} as const;

export interface CleanItem {
  name: string;
  description: string | null;
  url: string | null;
  category: string | null;
  price: number | null;
}

export type ImportResult =
  | { ok: true; items: CleanItem[]; skipped: number; warnings: string[] }
  | { ok: false; error: string };

// Control characters, zero-width and bidi-override characters.
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2066-\u2069\uFEFF]/g;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(UNSAFE_CHARS, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max).trim() : text;
}

/** Accepts only plain http(s) links without embedded credentials. */
export function sanitizeUrl(raw: unknown): { ok: true; url: string | null } | { ok: false } {
  if (raw === undefined || raw === null || raw === '') return { ok: true, url: null };
  if (typeof raw !== 'string') return { ok: false };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };
  if (trimmed.length > LIMITS.url || trimmed.replace(UNSAFE_CHARS, '') !== trimmed) {
    return { ok: false };
  }
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false };
  if (u.username || u.password || !u.hostname) return { ok: false };
  return { ok: true, url: u.toString() };
}

function cleanPrice(value: unknown): number | null {
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string') {
    n = Number(value.replace(/[$,\s]/g, ''));
  } else {
    return null;
  }
  if (!Number.isFinite(n) || n <= 0 || n > LIMITS.maxPrice) return null;
  return Math.round(n * 100) / 100;
}

/** Validates the `items` array of an import. Never throws. */
export function parseImportItems(raw: unknown): ImportResult {
  if (!Array.isArray(raw)) return { ok: false, error: 'Expected a list of items.' };
  if (raw.length === 0) return { ok: false, error: 'No items found.' };
  if (raw.length > LIMITS.maxItemsPerImport) {
    return { ok: false, error: `Too many items. Import up to ${LIMITS.maxItemsPerImport} at a time.` };
  }

  const items: CleanItem[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      skipped++;
      continue;
    }
    const e = entry as Record<string, unknown>;
    const name = cleanText(e.name, LIMITS.name);
    if (!name) {
      skipped++;
      continue;
    }

    const urlCheck = sanitizeUrl(e.url);
    let url: string | null = null;
    if (urlCheck.ok) {
      url = urlCheck.url;
    } else {
      warnings.push(`"${name}": link ignored because it isn't a valid http(s) address.`);
    }

    const key = `${name.toLowerCase()}|${url ?? ''}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);

    let category = cleanText(e.category, LIMITS.category);
    if (category && category.toLowerCase() === 'uncategorized') category = null;

    items.push({
      name,
      description: cleanText(e.description, LIMITS.description),
      url,
      category,
      price: cleanPrice(e.price),
    });
  }

  if (items.length === 0) return { ok: false, error: 'No valid items found.' };
  return { ok: true, items, skipped, warnings };
}
