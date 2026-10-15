const CATEGORY_LANGUAGES = ['ca', 'es', 'en'];

// Maps' label can be more specific than Places' primaryType (e.g. Catalan cuisine).
// Fetch it through REST: the Maps JavaScript Place class does not expose it.
async function fetchGoogleMapsTypeLabels(placeId, apiKey) {
  const entries = await Promise.all(CATEGORY_LANGUAGES.map(async (language) => {
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
    url.searchParams.set('languageCode', language);
    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'googleMapsTypeLabel',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`Google Maps category request failed (${response.status}, ${language}).`);
    }
    const place = await response.json();
    const label = place.googleMapsTypeLabel?.text;
    return [language, typeof label === 'string' ? label.trim() : ''];
  }));

  return Object.fromEntries(entries.filter(([, label]) => label));
}

module.exports = { CATEGORY_LANGUAGES, fetchGoogleMapsTypeLabels };
