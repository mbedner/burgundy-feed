// ─── Burgundy Feed Service Worker ─────────────────────────────────────────────
// Strategy:
//   Static assets (/_astro/*, /icons/*, /favicon.svg): cache-first, immutable
//   Main HTML (/):  network-first, stale fallback
//   Everything else: network only

const CACHE   = 'bf-v1';
const OFFLINE = '/';   // serve cached index on offline

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Static hashed assets & icons — cache-first
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.json'
  ) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // Main HTML — network-first, fallback to cached version
  if (request.mode === 'navigate' || url.pathname === '/') {
    e.respondWith(networkFirst(request));
    return;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(CACHE);
    cache.put(req, res.clone());
  }
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req) || await cache.match(OFFLINE);
    return cached ?? new Response('Offline', { status: 503 });
  }
}
