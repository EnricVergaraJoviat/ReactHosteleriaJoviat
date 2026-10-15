const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fetchGoogleMapsTypeLabels } = require('./googlePlaceCategories');
const { backfillGoogleMapsCategories } = require('./backfillGoogleMapsCategories');
const { getGoogleMapsCategories } = require('./index');

const labels = { ca: 'Restaurant de cuina catalana', es: 'Restaurante de cocina catalana', en: 'Catalonian restaurant' };

function mockLabels(t, responseForLanguage = (language) => ({ text: labels[language] })) {
  return t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url.origin, 'https://places.googleapis.com');
    assert.equal(url.pathname, '/v1/places/place-1');
    assert.equal(options.headers['X-Goog-FieldMask'], 'googleMapsTypeLabel');
    assert.equal(options.headers['X-Goog-Api-Key'], 'test-key');
    const label = responseForLanguage(url.searchParams.get('languageCode'));
    return { ok: true, json: async () => ({ googleMapsTypeLabel: label }) };
  });
}

test('requests the actual Maps label in all three app languages', async (t) => {
  const fetchMock = mockLabels(t);
  assert.deepEqual(await fetchGoogleMapsTypeLabels('place-1', 'test-key'), labels);
  assert.equal(fetchMock.mock.callCount(), 3);
});

test('does not invent a Maps label when Google omits it', async (t) => {
  mockLabels(t, () => undefined);
  assert.deepEqual(await fetchGoogleMapsTypeLabels('place-1', 'test-key'), {});
});

test('rejects HTTP failures without returning an error body or API key', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: false, status: 403 }));
  await assert.rejects(fetchGoogleMapsTypeLabels('place-1', 'test-key'), /failed \(403, ca\)/);
});

test('category callable requires an authenticated administrator', async () => {
  await assert.rejects(getGoogleMapsCategories.run({ data: { placeId: 'place-1' } }), { code: 'unauthenticated' });
});

function mockDb(t, records, updateError) {
  const docs = records.map((data, i) => ({
    id: `restaurant-${i}`, data: () => data, updateTime: `version-${i}`,
    ref: { update: t.mock.fn(async () => { if (updateError) throw updateError; }) },
  }));
  const db = { collection: (name) => {
    assert.equal(name, 'Restaurant');
    return { select: () => ({ get: async () => ({ docs }) }) };
  } };
  return { db, docs };
}

test('backfill previews without writing, then updates only categories with a concurrency precondition', async (t) => {
  mockLabels(t);
  const { db, docs } = mockDb(t, [{ Name: "El Cigró d'Or", GooglePlaceId: 'place-1', Phone: 'unchanged' }]);
  const preview = await backfillGoogleMapsCategories(db, 'test-key');
  assert.equal(preview[0].status, 'preview');
  assert.equal(docs[0].ref.update.mock.callCount(), 0);
  const result = await backfillGoogleMapsCategories(db, 'test-key', { apply: true });
  assert.equal(result[0].status, 'updated');
  assert.deepEqual(docs[0].ref.update.mock.calls[0].arguments, [
    { GoogleMapsTypeLabels: labels }, { lastUpdateTime: 'version-0' },
  ]);
});

test('backfill skips complete records and missing IDs without making billable requests', async (t) => {
  const fetchMock = mockLabels(t);
  const { db } = mockDb(t, [{ Name: 'Manual' }, { GooglePlaceId: 'place-1', GoogleMapsTypeLabels: labels }]);
  const results = await backfillGoogleMapsCategories(db, 'test-key', { apply: true });
  assert.deepEqual(results.map((r) => r.reason), ['missing-place-id', 'already-complete']);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('backfill leaves data untouched when Google fails and reports concurrent edits', async (t) => {
  const fetchMock = t.mock.method(global, 'fetch', async () => ({ ok: false, status: 503 }));
  const { db, docs } = mockDb(t, [{ GooglePlaceId: 'place-1', GoogleMapsTypeLabels: { ca: 'Restaurant' } }]);
  assert.equal((await backfillGoogleMapsCategories(db, 'test-key', { apply: true }))[0].status, 'failed');
  assert.equal(docs[0].ref.update.mock.callCount(), 0);
  fetchMock.mock.restore();
  mockLabels(t);
  const conflict = mockDb(t, [{ GooglePlaceId: 'place-1' }], new Error('Document changed'));
  const results = await backfillGoogleMapsCategories(conflict.db, 'test-key', { apply: true });
  assert.equal(results[0].status, 'failed');
  assert.equal(results[0].message, 'Document changed');
});
