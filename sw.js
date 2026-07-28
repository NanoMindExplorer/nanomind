// Nanomind Explorer service worker
// Strategi:
//   - HTML / JS / CSS / fonts → network-first (cache fallback offline only)
//     supaya update code langsung keliatan tanpa hard refresh.
//   - JSON data (db.json, x-articles.json, medium-articles.json,
//     telegram-posts.json) → stale-while-revalidate (data update tiap
//     2-15 menit oleh GitHub Actions, SW biarin serve cached sambil
//     revalidate di background).
//   - External API (fxtwitter, raw.githubusercontent, cdnjs) → network
//     with cache fallback.
//   - Media lokal (gambar) → cache-first, update in background.
const CACHE_NAME = 'nanomind-journal-cache-v14';
const SHELL_ASSETS = [
    './',
    './index.html',
    './article.html',
    './about.html',
    './watch.html',
    './telegram.html',
    './style.css',
    './fonts.css',
    './script.js',
    './sw.js',
    './db.json',
    './x-articles.json',
    './medium-articles.json',
    './telegram-posts.json',
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

// Asset yang harus selalu fresh (network-first) — kapanpun ada update code,
// user langsung dapet versi baru tanpa harus hard-refresh / clear cache.
const NETWORK_FIRST = new Set([
    './',
    './index.html',
    './article.html',
    './about.html',
    './watch.html',
    './telegram.html',
    './script.js',
    './style.css',
    './fonts.css',
    './sw.js',
    './manifest.json'
]);

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
            // Hapus SEMUA cache selain CACHE_NAME (v12, v11, dst auto-cleaned).
            keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // External APIs / raw github / CDN — network with cache fallback
    if (url.hostname.includes('githubusercontent.com') ||
        url.hostname.includes('api.github.com') ||
        url.hostname.includes('fxtwitter.com') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('telesco.pe') ||
        url.hostname.includes('t.me')) {
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

    // Resolve pathname ke root-relative (./path) biar match NETWORK_FIRST
    const rootRel = './' + url.pathname.replace(/^\/+/, '');

    // === Network-first: HTML / JS / CSS / sw.js / manifest ===
    // Update code langsung keliatan. Cache cuma fallback offline.
    if (NETWORK_FIRST.has(rootRel) ||
        rootRel === './' ||
        rootRel.endsWith('.html') ||
        rootRel.endsWith('.css') ||
        rootRel.endsWith('.js')) {
        event.respondWith(
            fetch(req).then((res) => {
                if (res && res.ok) {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                }
                return res;
            }).catch(() => caches.match(req).then(c => c || Response.error()))
        );
        return;
    }

    // === JSON data: stale-while-revalidate ===
    // Data ditarik otomatis tiap 15 menit oleh GitHub Actions — biarin
    // cached version serve dulu sambil revalidate di background.
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

    // === Media lokal (gambar / font / icon): cache-first, update in background ===
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
