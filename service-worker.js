const CACHE_NAME = "bcfl-cache-v1";
const STATIC_ASSETS = [
  "/britishclassicfl/",
  "/britishclassicfl/index.html",
  "/britishclassicfl/leaderboard.html",
  "/britishclassicfl/accuracy.html",
  "/britishclassicfl/metrics.html",
  "/britishclassicfl/entry.html",
  "/britishclassicfl/icon-192.png",
  "/britishclassicfl/icon-512.png",
  "/britishclassicfl/fix-dropdown.css",
  "/britishclassicfl/bc25_logo.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => (k === CACHE_NAME ? null : caches.delete(k)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
