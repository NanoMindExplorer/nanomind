const CACHE_NAME = 'nanomind-journal-cache-v11';
const SHELL_ASSETS = [
    './',
    './index.html',
    './article.html',
    './about.html',
    './watch.html',
    './style.css',
    './fonts.css',
    './script.js',
    './x-articles.json',
    './bg-ghibli-poster.webp',
    './bg-ghibli-poster.jpg',
    './favicon.svg',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './fonts/inter-400.woff2',
    './fonts/inter-600.woff2',
    './fonts/fraunces-600.woff2',
    './fonts/source-serif-4-400.woff2'
];

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
