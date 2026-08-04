// Nanomind Explorer service worker
// Strategi:
//   - HTML / JS / CSS / fonts → network-first (cache fallback offline only)
//     supaya update code langsung keliatan tanpa hard refresh.
//   - JSON data → stale-while-revalidate.
//   - External API → network with cache fallback.
//   - Media lokal → cache-first, update in background.
//
// Auto-update: SW cek update setiap jam (lewat updateViaCache: 'none' +
// manual check di 'controllerchange'). Saat SW baru terdeteksi,
// skipWaiting() + message semua clients untuk reload.
const CACHE_NAME = 'nanomind-journal-cache-v25';
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
    // skipWaiting = langsung activate SW baru, gak nunggu old tab ditutup
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .catch(() => { /* partial shell ok */ })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // Hapus SEMUA cache lama (v14, v13, v12, dst).
        const keys = await caches.keys();
        await Promise.all(
            keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        );
        // clients.claim = langsung control semua tab yang buka, gak nunggu refresh
        await self.clients.claim();
        // Beritahu semua clients supaya reload & dapat code baru
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach(c => {
            c.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
    })());
});

// === Auto-update check ===
// Setiap 1 jam, cek apakah ada SW baru di server. Kalau ada, langsung
// install + activate (skipWaiting sudah otomatis).
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
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
        url.hostname.includes('t.me') ||
        url.hostname.includes('pbs.twimg.com')) {
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
    // Tambahan: cache-busting — kalau request punya query string ?v=...,
    // anggap sebagai resource baru, selalu fetch dari network.
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

    // === JSON data: network-first (dulu stale-while-revalidate) ===
    // db.json / x-articles.json / medium-articles.json / telegram-posts.json
    // sering berubah (auto-sync tiap ~2 jam). Stale-while-revalidate bikin
    // pengunjung yang browsernya udah pernah cache versi lama/kosong akan
    // TERUS lihat versi itu sampai revalidate berikutnya — kadang gak pernah
    // "kelihatan" update karena tab jarang di-reload. Network-first pastikan
    // data selalu fresh selama online; cache cuma fallback pas offline.
    if (url.pathname.endsWith('.json')) {
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
