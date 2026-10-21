import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImportItems, sanitizeUrl, LIMITS } from '../src/importItems.ts';

test('sanitizeUrl accepts http(s) and rejects everything else', () => {
  assert.deepEqual(sanitizeUrl('https://example.com/a?b=1'), { ok: true, url: 'https://example.com/a?b=1' });
  assert.deepEqual(sanitizeUrl(''), { ok: true, url: null });
  assert.deepEqual(sanitizeUrl(undefined), { ok: true, url: null });
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://x.com', 'https://user:pw@example.com', 'not a url', 'https://', 42, {}, 'https://exa\u0000mple.com']) {
    assert.equal(sanitizeUrl(bad as any).ok, false, String(bad));
  }
  assert.equal(sanitizeUrl('https://example.com/' + 'a'.repeat(LIMITS.url)).ok, false);
});

test('valid import is cleaned', () => {
  const r = parseImportItems([
    { name: '  Wild   Robot ', category: 'Books', price: '$12.99', url: 'https://amazon.com/dp/1', description: 'Hardcover' },
    { name: 'Boots', category: 'Uncategorized', price: null },
  ]);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.items[0].name, 'Wild Robot');
    assert.equal(r.items[0].price, 12.99);
    assert.equal(r.items[1].category, null);
    assert.equal(r.items[1].price, null);
  }
});

test('bad links are dropped with a warning, not stored', () => {
  const r = parseImportItems([{ name: 'Thing', url: 'javascript:alert(1)' }]);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.items[0].url, null);
    assert.equal(r.warnings.length, 1);
  }
});

test('rejects wrong shapes and oversize input', () => {
  assert.equal(parseImportItems({ items: [] } as any).ok, false);
  assert.equal(parseImportItems('hello').ok, false);
  assert.equal(parseImportItems(null).ok, false);
  assert.equal(parseImportItems([]).ok, false);
  assert.equal(parseImportItems(Array.from({ length: LIMITS.maxItemsPerImport + 1 }, (_, i) => ({ name: 'n' + i }))).ok, false);
  assert.equal(parseImportItems([1, 'x', null, [], { nope: true }]).ok, false);
});

test('skips duplicates and nameless entries; counts them', () => {
  const r = parseImportItems([{ name: 'A' }, { name: 'a' }, { name: '' }, 5, { name: 'B' }]);
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.items.map((i) => i.name), ['A', 'B']);
    assert.equal(r.skipped, 3);
  }
});

test('truncates long text, strips control and bidi characters, bounds prices', () => {
  const r = parseImportItems([
    { name: 'x'.repeat(1000), description: 'a\u202Eb\u0000c', category: 'c'.repeat(500), price: 1e12 },
    { name: 'Neg', price: -5 },
    { name: 'NaN', price: 'abc' },
    { name: 'Cheap', price: 0.004 },
  ]);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.items[0].name.length, LIMITS.name);
    assert.equal(r.items[0].description, 'a b c');
    assert.equal(r.items[0].category!.length, LIMITS.category);
    assert.equal(r.items[0].price, null);
    assert.equal(r.items[1].price, null);
    assert.equal(r.items[2].price, null);
    assert.equal(r.items[3].price, 0);
  }
});

test('ignores unexpected fields (no prototype pollution, no extra columns)', () => {
  const r = parseImportItems(JSON.parse('[{"name":"A","__proto__":{"x":1},"id":"123","purchased":true,"listId":"other"}]'));
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(Object.keys(r.items[0]).sort(), ['category', 'description', 'name', 'price', 'url']);
  }
});
