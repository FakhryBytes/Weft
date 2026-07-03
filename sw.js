// Weft service worker — cache-first, fully offline after first load.
// Bump CACHE_VERSION any time you edit app files or data so the new
// versions get picked up.
const CACHE_VERSION = "weft-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/storage.js",
  "./js/srs.js",
  "./js/data.js",
  "./js/app.js",
  "./data/vocab_de.json",
  "./data/vocab_nl.json",
  "./data/vocab_en.json",
  "./data/grammar_de.json",
  "./data/grammar_nl.json",
  "./data/grammar_en.json",
  "./fonts/PlexSans-Regular.woff2",
  "./fonts/PlexSans-Medium.woff2",
  "./fonts/PlexSans-SemiBold.woff2",
  "./fonts/PlexSans-Bold.woff2",
  "./fonts/PlexSerif-Medium.woff2",
  "./fonts/PlexSerif-SemiBold.woff2",
  "./fonts/PlexMono-Regular.woff2",
  "./fonts/PlexMono-Medium.woff2",
  "./fonts/PlexSansArabic-Regular.woff2",
  "./fonts/PlexSansArabic-Medium.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first, falling back to network, and updating the cache in the
// background so content stays fresh without ever blocking on a network call.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
