const { CATEGORY_LANGUAGES, fetchGoogleMapsTypeLabels } = require('./googlePlaceCategories');

// Defaults to a preview. Call with apply: true after reviewing the results.
async function backfillGoogleMapsCategories(db, apiKey, { apply = false, onResult = () => {} } = {}) {
  const snapshot = await db.collection('Restaurant')
    .select('Name', 'GooglePlaceId', 'GoogleMapsTypeLabels').get();
  const results = [];
  for (const document of snapshot.docs) {
    const restaurant = document.data();
    const current = restaurant.GoogleMapsTypeLabels || {};
    const result = { id: document.id, name: restaurant.Name || '', status: 'skipped' };
    if (!restaurant.GooglePlaceId) {
      result.reason = 'missing-place-id';
    } else if (CATEGORY_LANGUAGES.every((language) => typeof current[language] === 'string' && current[language].trim())) {
      result.reason = 'already-complete';
    } else {
      try {
        const labels = await fetchGoogleMapsTypeLabels(restaurant.GooglePlaceId, apiKey);
        result.labels = { ...current, ...labels };
        if (CATEGORY_LANGUAGES.some((language) => labels[language] && labels[language] !== current[language])) {
          if (apply) {
            // Update only categories, and never overwrite a document edited after this read.
            await document.ref.update({ GoogleMapsTypeLabels: result.labels }, {
              lastUpdateTime: document.updateTime,
            });
          }
          result.status = apply ? 'updated' : 'preview';
        } else {
          result.reason = 'no-new-labels';
        }
      } catch (error) {
        result.status = 'failed';
        result.message = error.message;
      }
    }
    results.push(result);
    onResult(result);
  }
  return results;
}

module.exports = { backfillGoogleMapsCategories };
