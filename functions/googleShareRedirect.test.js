const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fetchGoogleSharePage } = require('./googleShareRedirect');

test('extracts the real example redirect without fetching Google Search', async (t) => {
  const urls = [
    'https://share.google/BZUfy4KSbnJ98T5Ou',
    'https://www.google.com/share.google?q=BZUfy4KSbnJ98T5Ou',
    'https://www.google.com/search?kgmid=/g/11gdxnzwq7&q=Restaurant+Atl%C3%A0ntida',
  ];
  let calls = 0;
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, urls[calls]);
    assert.equal(options.redirect, 'manual');
    assert.ok(calls < 2, 'must not request the blocked search page');
    return { status: 302, headers: new Headers({ location: urls[++calls] }) };
  });
  const response = await fetchGoogleSharePage(urls[0], {});
  assert.equal(response.url, urls[2]);
  assert.equal(calls, 2);
  assert.equal(await response.text(), '');
});

test('rejects redirects outside Google before requesting them', async (t) => {
  const mocked = t.mock.method(global, 'fetch', async () => ({
    status: 302, headers: new Headers({ location: 'https://example.com/' }),
  }));
  await assert.rejects(fetchGoogleSharePage('https://share.google/example', {}), /Unsupported/);
  assert.equal(mocked.mock.callCount(), 1);
});

test('limits redirect loops', async (t) => {
  const mocked = t.mock.method(global, 'fetch', async () => ({
    status: 302, headers: new Headers({ location: 'https://share.google/example' }),
  }));
  await assert.rejects(fetchGoogleSharePage('https://share.google/example', {}), /Too many/);
  assert.equal(mocked.mock.callCount(), 8);
});
