/* Intellivest service worker: installable PWA + light offline fallback */
const CACHE_VERSION = 'intellivest-v1';
const PRECACHE_URLS = ['./index.html', './styles.css', './app.js', './manifest.webmanifest'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(function (cache) {
        return cache.addAll(
          PRECACHE_URLS.map(function (path) {
            return new Request(path, { cache: 'reload', credentials: 'same-origin' });
          })
        );
      })
      .catch(function () {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE_VERSION;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        var dest = event.request.destination;
        if (dest === 'style' || dest === 'script' || dest === 'image') {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (c) {
            c.put(event.request, copy);
          });
        }
        return response;
      });
    })
  );
});
