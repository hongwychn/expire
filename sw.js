// Bump the version whenever index.html changes so old caches get dropped.
const CACHE = 'expiry-tracker-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: answer from cache instantly (works offline), refresh the cache in the background.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const net = fetch(req).then(res => {
    if (!res.ok || res.redirected) return res;
    const copy = res.clone();
    return caches.open(CACHE).then(c => c.put(req, copy)).then(() => res, () => res);
  });
  e.waitUntil(net.then(() => {}, () => {}));
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || net.catch(() =>
      req.mode === 'navigate' ? caches.match('./index.html') : Promise.reject(new Error('offline'))))
  );
});
