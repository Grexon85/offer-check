// Offer Check service worker: makes the site installable and usable offline.
// Pages: network first (always fresh), falling back to the last copy. Assets: cache first.
const CACHE = "offer-check-v5";
const CORE = ["/", "/guide", "/assets/site.css?v=3", "/assets/calc.js?v=3", "/assets/icon.svg",
  "/assets/fonts/plus-jakarta-sans-latin-400-normal.woff2", "/assets/fonts/plus-jakarta-sans-latin-600-normal.woff2",
  "/assets/fonts/plus-jakarta-sans-latin-700-normal.woff2", "/assets/fonts/plus-jakarta-sans-latin-800-normal.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, copy)); }
      return res;
    }).catch(() => caches.match(url.pathname).then((r) => r || caches.match("/"))));
    return;
  }
  if (url.pathname.startsWith("/assets/") && !url.pathname.endsWith(".mp4")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
