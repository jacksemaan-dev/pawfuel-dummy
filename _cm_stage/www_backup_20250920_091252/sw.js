// Bump the cache name whenever assets change to ensure the service worker
// fetches and caches the latest versions of our files. This is v2 for the
// photographic wolf background and additional assets.
// Bump the cache name whenever assets change. This version is v3 to
// ensure browsers fetch the updated script (including product category
// grouping, Pro toggle and PDF export) instead of the previously cached
// version.
// Increment the cache name to invalidate previously cached assets.  v4 covers
// updates to product deduplication, improved dialogs, Pro labelling and
// price display.
// Bump the cache name to v5 to force a refresh of cached assets.  This
// version includes updated category grouping, improved dialog styles,
// deduplication and a visible Pro toggle with price.  Whenever
// updating assets, increment the suffix (e.g. v5, v6) so browsers
// invalidate older caches.
// Increment the cache name to v6 to ensure users receive the latest
// category grouping, deduplication, Pro gating and improved modal styles.
// Increment the cache name to force clients to update cached assets when
// significant modifications are made.  v7 includes improvements to
// dialog readability, larger Pro toggle styling, and a refreshed
// product catalogue with deduplication and category grouping.  Bumping
// the suffix ensures old caches are cleared and new assets are
// downloaded.
// Increment the cache name to v9 for the PawFuel rebranding and new icon assets.
const CACHE_NAME = 'rawpaw-cache-v9';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/wolf_background.jpg'
  // Note: additional assets will be fetched on demand and cached implicitly.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      // fallback to index for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});