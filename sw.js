const CACHE_NAME = 'influence-30day-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML = req.mode === 'navigate' ||
    (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));

  if (isHTML) {
    // ページ本体は常にネットワークを優先。ブラウザの通常キャッシュも
    // 経由させず（cache:'no-store'）、必ず最新のバイト列を取りにいく。
    // オフライン時だけキャッシュにフォールバックする。
    event.respondWith(
      fetch(req, { cache: 'no-store' }).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // アイコンなど静的資産はキャッシュ優先（オフラインでも開けるように）
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
