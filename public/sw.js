/* Minimal SW: cache app shell for offline-ish experience */
const CACHE_NAME = 'catalogoflip-v1';
const CORE_ASSETS = [
  '/',
  '/landing',
  '/catalog',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const url = new URL(request.url);
          // Cache only same-origin static-ish requests
          if (url.origin === self.location.origin && (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/public/') || url.pathname.endsWith('.svg'))) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});


