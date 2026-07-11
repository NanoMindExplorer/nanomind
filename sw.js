const CACHE_NAME = 'nanomind-cache-v1';
const SHELL_ASSETS = [
    './',
    './index.html',
    './script.js',
    './favicon.svg',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .catch(() => { /* asset belum tersedia saat build pertama, aman diabaikan */ })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Data dinamis (db.json / GitHub API): network-first supaya selalu fresh saat online,
    // fallback ke cache saat offline.
    if (url.hostname.includes('githubusercontent.com') || url.hostname.includes('api.github.com')) {
        event.respondWith(
            fetch(req).then((res) => {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                return res;
            }).catch(() => caches.match(req))
        );
        return;
    }

    // App shell (file di origin sendiri): cache-first, lalu update cache di background.
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(req).then((cached) => {
                const fetchPromise = fetch(req).then((res) => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                    return res;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
    }
});
