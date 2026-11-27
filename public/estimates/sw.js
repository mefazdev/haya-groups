const CACHE_NAME = "adco-estimates-v2";
const PRECACHE_URLS = [
  "/estimates/icon-192.png",
  "/estimates/icon-512.png",
  "/estimates/apple-touch-icon.png",
  "/images/adco-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept or cache Next.js chunks in local development.
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (isLocalhost) return;

  // Never cache API calls or authentication endpoints.
  if (url.pathname.startsWith("/estimates/api/")) return;

  // Serve cached static Adco branding icons/fonts when available.
  if (
    PRECACHE_URLS.includes(url.pathname) ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Network-first for HTML pages inside /estimates, with a friendly offline fallback.
  if (request.mode === "navigate" && url.pathname.startsWith("/estimates")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | Adco Estimates</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8f3ea;color:#26221c;font-family:system-ui,sans-serif;padding:24px;text-align:center}.card{max-width:360px;background:#fff;border:1px solid #e4d9c3;border-radius:12px;padding:24px}h1{margin:0 0 8px;color:#5c4726;font-size:22px}p{margin:0 0 16px;color:#5f574b;line-height:1.5}button{background:#6f5629;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:16px;cursor:pointer}</style></head><body><div class="card"><h1>You are offline</h1><p>Adco Estimates needs an internet connection to sync with the database.</p><button onclick="location.reload()">Try again</button></div></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
  }
});
