import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAffiliateTag, expandAmazonShortLink, tagItemUrls, isAmazonShortLink } from '../src/affiliate.ts';

const redirect = (loc: string) => new Response(null, { status: 301, headers: { location: loc } });

test('tags plain amazon links, leaves existing tags', () => {
  assert.equal(withAffiliateTag('https://www.amazon.com/dp/B000', 'me-20'), 'https://www.amazon.com/dp/B000?tag=me-20');
  assert.equal(withAffiliateTag('https://www.amazon.com/dp/B000?tag=x-20', 'me-20'), 'https://www.amazon.com/dp/B000?tag=x-20');
  assert.equal(withAffiliateTag('https://example.com/a', 'me-20'), 'https://example.com/a');
});

test('short-link detection', () => {
  assert.ok(isAmazonShortLink('https://a.co/d/abc'));
  assert.ok(isAmazonShortLink('https://amzn.to/xyz'));
  assert.ok(!isAmazonShortLink('http://a.co/d/abc'));
  assert.ok(!isAmazonShortLink('https://a.co.evil.com/x'));
});

test('expands a.co -> amazon.com', async () => {
  const f = async () => redirect('https://www.amazon.com/dp/B123?ref=x');
  assert.equal(await expandAmazonShortLink('https://a.co/d/abc', f), 'https://www.amazon.com/dp/B123?ref=x');
});

test('follows allowlisted hops (a.co -> amzn.to -> amazon.com)', async () => {
  const calls: string[] = [];
  const f = async (u: string) => {
    calls.push(u);
    return u.startsWith('https://a.co') ? redirect('https://amzn.to/q') : redirect('https://www.amazon.com/dp/B9');
  };
  assert.equal(await expandAmazonShortLink('https://a.co/d/abc', f), 'https://www.amazon.com/dp/B9');
  assert.equal(calls.length, 2);
});

test('SSRF: never fetches a non-allowlisted redirect target', async () => {
  for (const evil of ['http://169.254.169.254/latest/meta-data', 'https://internal.example/x', 'https://127.0.0.1/', 'https://amazon.com.evil.io/dp/1', 'file:///etc/passwd']) {
    const calls: string[] = [];
    const f = async (u: string) => { calls.push(u); return redirect(evil); };
    assert.equal(await expandAmazonShortLink('https://a.co/d/abc', f), null, evil);
    assert.equal(calls.length, 1, `only the short link may be fetched (${evil})`);
  }
});

test('rejects non-short input and non-redirect responses', async () => {
  const f = async () => { throw new Error('should not fetch'); };
  assert.equal(await expandAmazonShortLink('https://example.com/x', f as any), null);
  assert.equal(await expandAmazonShortLink('https://a.co/d/abc', async () => new Response('ok', { status: 200 })), null);
  assert.equal(await expandAmazonShortLink('https://a.co/d/abc', async () => { throw new Error('net'); }), null);
});

test('redirect loop is capped', async () => {
  let n = 0;
  const f = async () => { n++; return redirect('https://a.co/d/loop'); };
  assert.equal(await expandAmazonShortLink('https://a.co/d/loop', f), null);
  assert.ok(n <= 3);
});

test('tagItemUrls: expands, tags, keeps existing tags, caps expansions', async () => {
  const f = async (u: string) => redirect(u.endsWith('/tagged') ? 'https://www.amazon.com/dp/T?tag=other-20' : 'https://www.amazon.com/dp/Z');
  const out = await tagItemUrls(
    ['https://a.co/d/one', 'https://a.co/d/tagged', 'https://www.amazon.com/dp/D', 'https://example.com', null],
    'me-20', { fetchFn: f });
  assert.deepEqual(out, [
    'https://www.amazon.com/dp/Z?tag=me-20',
    'https://a.co/d/tagged',
    'https://www.amazon.com/dp/D?tag=me-20',
    'https://example.com',
    null,
  ]);
  let calls = 0;
  const many = Array.from({ length: 25 }, (_, i) => `https://a.co/d/${i}`);
  await tagItemUrls(many, 'me-20', { fetchFn: async () => { calls++; return redirect('https://www.amazon.com/dp/Z'); } });
  assert.equal(calls, 10);
});

test('no tag configured: nothing is fetched', async () => {
  const out = await tagItemUrls(['https://a.co/d/x'], '', { fetchFn: async () => { throw new Error('no'); } });
  assert.deepEqual(out, ['https://a.co/d/x']);
});
