// ─── Burgundy Feed Service Worker ─────────────────────────────────────────────
// Strategy:
//   Static assets (/_astro/*, /icons/*, /favicon.svg): cache-first, immutable
//   Main HTML (/):  network-first, stale fallback
//   Everything else: network only

const CACHE   = 'bf-v2';
const OFFLINE = '/';

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());

// ── Activate: evict stale caches, claim clients ───────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Notify all open tabs that a new version is active
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
        });
      }),
  );
});

// ── Message: page can send SKIP_WAITING to force activate ────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
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

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'Burgundy Feed', body: 'New update', url: '/', tag: 'bf-update' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icons/icon-192.svg',
      badge:   '/icons/icon-192.svg',
      data:    { url: data.url },
      tag:     data.tag,          // deduplicates: replaces earlier notification with same tag
      renotify: false,
    }),
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => {
        try { return new URL(c.url).pathname === new URL(url, self.location.origin).pathname; } catch { return false; }
      });
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
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
