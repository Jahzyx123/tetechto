/* NEON FORGE service worker — offline-first cache for the modular app.

   SW_VERSION is rewritten on every deploy by tools/stamp.js: a new build
   gets a brand-new cache name, and every older cache is deleted on
   activate, so you can never run a mixed-generation app offline.

   Strategy:
   - navigations (index.html): network-first, cached fallback offline —
     online you always get the newest shell, offline the last one loads.
   - modules / styles / data / icons: stale-while-revalidate — instant
     loads, refreshed in the background. */
const SW_VERSION = "nf-sw-dev";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon.svg"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SW_VERSION).then(c => c.addAll(CORE)).catch(() => { }));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SW_VERSION).then(c => c.put("./index.html", copy)).catch(() => { });
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      const refresh = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SW_VERSION).then(c => c.put(req, copy)).catch(() => { });
        }
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
