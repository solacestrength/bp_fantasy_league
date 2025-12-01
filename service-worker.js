// Cache-first service worker for static BCFL pages

const CACHE_NAME = "bcfl-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/leaderboard.html",
  "/accuracy.html",
  "/metrics.html",
  "/entry.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/bc25_logo.jpg",
  "/fix-dropdown.css"
];

self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => (key === CACHE_NAME ? null : caches.delete(key)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});
