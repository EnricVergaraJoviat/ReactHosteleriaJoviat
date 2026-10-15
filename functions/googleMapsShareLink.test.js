const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolveGoogleMapsShareLink } = require('./index');

const sharedUrl = 'https://share.google/BZUfy4KSbnJ98T5Ou';
const searchUrl = 'https://www.google.com/search?kgmid=/g/11gdxnzwq7&q=Restaurant+Atl%C3%A0ntida';
const mapsUrl = 'https://www.google.com/maps/search/?api=1&query_place_id=ChIJexample';

function mockGoogle(t, { finalUrl, html, query, found = true, places, location, nearbyPlaces }) {
  t.mock.method(global, 'fetch', async (url, options) => {
    if (url instanceof URL && url.searchParams.has('languageCode')) {
      assert.equal(options.headers['X-Goog-FieldMask'], 'googleMapsTypeLabel');
      return { ok: true, json: async () => ({ googleMapsTypeLabel: { text: 'Restaurant de cuina catalana' } }) };
    }
    if (url === sharedUrl) {
      assert.equal(options.redirect, 'manual');
      return { ok: true, url: finalUrl, text: async () => html };
    }
    if (url === 'https://places.googleapis.com/v1/places:searchNearby') {
      assert.deepEqual(JSON.parse(options.body).locationRestriction.circle.center, location);
      return { ok: true, json: async () => ({ places: nearbyPlaces }) };
    }
    if (url === 'https://places.googleapis.com/v1/places:searchText') {
      assert.equal(JSON.parse(options.body).textQuery, query);
      return { ok: true, json: async () => ({ places: places || (found ? [{ id: 'ChIJexample', location }] : []) }) };
    }
    assert.equal(url, 'https://places.googleapis.com/v1/places/ChIJexample');
    return {
      ok: true,
      json: async () => ({
        id: 'ChIJexample', displayName: { text: 'Restaurant Atlàntida' },
        googleMapsUri: mapsUrl, location,
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
  await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), { code: 'failed-precondition' });
  assert.equal(global.fetch.mock.callCount(), 1);
});

test('still resolves a Maps place path after a redirect', async (t) => {
  mockGoogle(t, { finalUrl: mapsUrl, html: '' });
  const result = await resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } });
  assert.equal(result.googlePlaceId, 'ChIJexample');
  assert.equal(result.googleMapsTypeLabels.ca, 'Restaurant de cuina catalana');
});

const vicLocation = { latitude: 41.9247058, longitude: 2.2538479 };
const trocaderoUrl = 'https://www.google.es/maps/place/TROCADERO/@41.9247058,2.251273,17z/data=!3m1!4b1!4m6!3m5!8m2!3d41.9247058!4d2.2538479!16s%2Fg%2F11t31btbwt';

test('selects the Trocadero in Vic even when a distant namesake is ranked first', async (t) => {
  mockGoogle(t, {
    finalUrl: trocaderoUrl,
    // A canonical URL can omit the coordinates, and HTML can mention other places.
    html: '<link rel="canonical" href="https://www.google.es/maps/place/TROCADERO/"><script>{"place_id":"wrong-place"}</script>',
    query: 'TROCADERO', location: vicLocation,
    places: [
      { id: 'wrong-place', location: { latitude: 48.86, longitude: 2.28 } },
      { id: 'ChIJexample', location: vicLocation },
    ],
  });
  const result = await resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } });
  assert.equal(result.googlePlaceId, 'ChIJexample');
  const searchCall = global.fetch.mock.calls.find(({ arguments: args }) => args[0].endsWith('searchText'));
  assert.deepEqual(JSON.parse(searchCall.arguments[1].body).locationBias.circle, {
    center: vicLocation, radius: 100,
  });
});

test('rejects a distant Trocadero when Google ignores the location bias', async (t) => {
  mockGoogle(t, {
    finalUrl: trocaderoUrl, html: '', query: 'TROCADERO',
    location: { latitude: 48.86, longitude: 2.28 },
  });
  await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), { code: 'not-found' });
  assert.equal(global.fetch.mock.callCount(), 2);
});

test('does not choose arbitrarily between multiple nearby places', async (t) => {
  mockGoogle(t, {
    finalUrl: trocaderoUrl, html: '', query: 'TROCADERO', location: vicLocation,
    places: [{ id: 'first', location: vicLocation }, { id: 'second', location: vicLocation }],
  });
  await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), { code: 'not-found' });
});

test('rejects name-only Maps links without a verifiable location or place ID', async (t) => {
  mockGoogle(t, { finalUrl: 'https://www.google.com/maps/place/TROCADERO/', html: '' });
  await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), {
    code: 'failed-precondition', details: { reason: 'google-place-unverified' },
  });
  assert.equal(global.fetch.mock.callCount(), 1);
});

test('checks that place details still match the shared marker', async (t) => {
  mockGoogle(t, {
    finalUrl: trocaderoUrl, html: '', query: 'TROCADERO',
    places: [{ id: 'ChIJexample', location: vicLocation }],
    location: { latitude: 48.86, longitude: 2.28 },
  });
  await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), {
    code: 'failed-precondition', details: { reason: 'google-place-unverified' },
  });
});

for (const matched of [true, false]) {
  test(`matches the shared CID exactly (match: ${matched})`, async (t) => {
    mockGoogle(t, {
      finalUrl: trocaderoUrl + '!1s0x12a52747c3235879:0x10233dc07c1fdf38',
      html: '', location: vicLocation,
      nearbyPlaces: [
        { id: 'wrong', googleMapsUri: 'https://maps.google.com/?cid=1162841025717198649' },
        ...(matched ? [{ id: 'ChIJexample', googleMapsUri: 'https://maps.google.com/?cid=1162841025717198648' }] : []),
      ],
    });
    if (matched) {
      const result = await resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } });
      assert.equal(result.googlePlaceId, 'ChIJexample');
    } else {
      await assert.rejects(resolveGoogleMapsShareLink.run({ data: { url: sharedUrl } }), {
        code: 'failed-precondition', details: { reason: 'google-place-unverified' },
      });
    }
  });
}
