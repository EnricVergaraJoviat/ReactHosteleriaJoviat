const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolveGoogleMapsShareLink } = require('./index');

const sharedUrl = 'https://share.google/BZUfy4KSbnJ98T5Ou';
const searchUrl = 'https://www.google.com/search?kgmid=/g/11gdxnzwq7&q=Restaurant+Atl%C3%A0ntida';
const mapsUrl = 'https://www.google.com/maps/search/?api=1&query_place_id=ChIJexample';

function mockGoogle(t, { finalUrl, html, query, found = true }) {
  t.mock.method(global, 'fetch', async (url, options) => {
    if (url === sharedUrl) {
      assert.equal(options.redirect, 'manual');
      return { ok: true, url: finalUrl, text: async () => html };
    }
    if (url === 'https://places.googleapis.com/v1/places:searchText') {
      assert.equal(JSON.parse(options.body).textQuery, query);
      return { ok: true, json: async () => ({ places: found ? [{ id: 'ChIJexample' }] : [] }) };
    }
    assert.equal(url, 'https://places.googleapis.com/v1/places/ChIJexample');
    return {
      ok: true,
      json: async () => ({
        id: 'ChIJexample', displayName: { text: 'Restaurant Atlàntida' },
        googleMapsUri: mapsUrl,
      }),
    };
  });
  const previousKey = process.env.GOOGLE_MAPS_API_KEY;
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  t.after(() => {
    if (previousKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = previousKey;
  });
}

test('rejects the Atlàntida Search identity instead of matching the first namesake in Vilassar', async (t) => {
  mockGoogle(t, {
    finalUrl: searchUrl,
    html: '<link rel="canonical" href="https://www.google.com/search"><title>Google</title>',
  });
  await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), {
    code: 'failed-precondition', details: { reason: 'google-place-unverified' },
  });
  // No Places text search or details request may run for an unverified entity.
  assert.equal(global.fetch.mock.callCount(), 1);
});

test('also rejects a plain Google Search query with no exact place identity', async (t) => {
  mockGoogle(t, { finalUrl: 'https://www.google.com/search?q=Restaurant+Atlantida', html: '' });
  await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), {
    code: 'failed-precondition', details: { reason: 'google-place-unverified' },
  });
  assert.equal(global.fetch.mock.callCount(), 1);
});

test('does not use an unresolved Google share token as a restaurant name', async (t) => {
  mockGoogle(t, { finalUrl: 'https://www.google.com/share.google?q=BZUfy4KSbnJ98T5Ou', html: '' });
  await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), { code: 'not-found' });
  assert.equal(global.fetch.mock.callCount(), 1);
});

test('still resolves a Maps place path after a redirect', async (t) => {
  mockGoogle(t, { finalUrl: 'https://www.google.com/maps/place/Restaurant+Atl%C3%A0ntida/', html: '', query: 'Restaurant Atlàntida' });
  const result = await resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } });
  assert.equal(result.googlePlaceId, 'ChIJexample');
});
