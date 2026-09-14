// Google Search may reject server-side page loads. Shared place links already
// contain the place query in their redirect, so no search-page fetch is needed.
async function fetchGoogleSharePage(sharedUrl, options) {
  if (new URL(sharedUrl).hostname !== 'share.google') {
    return fetch(sharedUrl, options);
  }

  let currentUrl = new URL(sharedUrl);
  for (let hop = 0; hop < 8; hop += 1) {
    if (
      ['google.com', 'www.google.com'].includes(currentUrl.hostname)
      && currentUrl.pathname === '/search'
      && currentUrl.searchParams.get('q')?.trim()
    ) {
      return { ok: true, url: currentUrl.href, text: async () => '' };
    }

    const response = await fetch(currentUrl.href, { ...options, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new Error('Missing Google share redirect location.');
    currentUrl = new URL(location, currentUrl);
    if (
      currentUrl.protocol !== 'https:'
      || !['share.google', 'google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(currentUrl.hostname)
      || currentUrl.port || currentUrl.username || currentUrl.password
    ) {
      throw new Error('Unsupported Google share redirect.');
    }
  }
  throw new Error('Too many Google share redirects.');
}

module.exports = { fetchGoogleSharePage };
