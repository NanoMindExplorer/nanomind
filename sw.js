const CACHE_NAME = 'nanomind-journal-cache-v12';
const SHELL_ASSETS = [
    './',
    './index.html',
    './article.html',
    './about.html',
    './watch.html',
    './style.css',
    './fonts.css',
    './script.js',
    './db.json',
    './x-articles.json',
    './sitemap.xml',
    './favicon.svg',
    './manifest.json',
    './bg-ghibli-poster.webp',
    './media/bg-ghibli-poster.webp',
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
            .catch(() => { /* partial shell ok */ })
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

/** Stale-while-revalidate for JSON/data; network-first for API; cache-first for shell */
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // External APIs / raw github — network with cache fallback
    if (url.hostname.includes('githubusercontent.com') ||
        url.hostname.includes('api.github.com') ||
        url.hostname.includes('fxtwitter.com') ||
        url.hostname.includes('cdnjs.cloudflare.com')) {
        event.respondWith(
            fetch(req).then((res) => {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                return res;
            }).catch(() => caches.match(req))
        );
        return;
    }

    if (url.origin !== self.location.origin) return;

    // JSON data: stale-while-revalidate
    if (url.pathname.endsWith('.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cached = await cache.match(req);
                const network = fetch(req).then((res) => {
                    if (res && res.ok) cache.put(req, res.clone());
                    return res;
                }).catch(() => cached);
                return cached || network;
            })
        );
        return;
    }

    // Same-origin shell & media: cache-first, update in background
    event.respondWith(
        caches.match(req).then((cached) => {
            const fetchPromise = fetch(req).then((res) => {
                if (res && res.ok) {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                }
                return res;
            }).catch(() => cached);
            return cached || fetchPromise;
        })
    );
});
