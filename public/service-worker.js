const CACHE_NAME = 'joviat-alumni-shell-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/logo192.png', '/logo512.png'];

const isNavigationRequest = (request) =>
  request.mode === 'navigate' ||
  (request.headers.get('accept') || '').includes('text/html');

const isStaticAsset = (url) =>
  url.origin === self.location.origin && url.pathname.startsWith('/static/');

const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/index.html');
  }
};

const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
    const responseToCache = networkResponse.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, responseToCache);
  }

  return networkResponse;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(event.request));
  }
});
