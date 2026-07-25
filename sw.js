const CACHE_NAME = 'nanomind-journal-cache-v8';
const SHELL_ASSETS = [
    './',
    './index.html',
    './article.html',
    './about.html',
    './watch.html',
    './style.css',
    './script.js',
    './x-articles.json',
    './bg-ghibli-poster.webp',
    './bg-ghibli-poster.jpg',
    './favicon.svg',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];
/* Video loop (webm/mp4) dimuat on-demand — tidak di-precache agar shell tetap ringan */

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .catch(() => { /* aman diabaikan saat build pertama */ })
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
