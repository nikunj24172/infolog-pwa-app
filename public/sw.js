// InfoLog Mobile service worker.
// SECURITY: caches only the static app shell + non-sensitive build assets
// (JS/CSS/fonts/images). It must NEVER cache API responses or authenticated
// data ("no local sensitive storage") — /api/ is always network-only.
const CACHE = "infolog-shell-v1";
const RUNTIME = "infolog-runtime-v1";
const SHELL = ["/", "/login", "/offline", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== RUNTIME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never touch API or auth traffic — always go to the network, no caching.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cached shell / offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((r) => r || caches.match("/offline"))
      )
    );
    return;
  }

  // Static assets: cache-first, then network. Successful responses are
  // runtime-cached so the app shell works offline (JS/CSS/fonts/images).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Only cache complete, same-origin ("basic") 200s.
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(RUNTIME).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(
          // Offline and not cached: resolve with a benign error Response so the
          // fetch handler never leaves an uncaught rejection.
          () => cached || Response.error()
        );
    })
  );
});
