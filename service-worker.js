// service-worker.js — SCIE Tanggap Map SAR Dashboard
const CACHE_NAME = 'scie-tanggap-v2';
const URLS_TO_CACHE = [
  '/map-sar-dashboard.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: cache shell dasar -- pakai allSettled supaya 1 file gagal (mis. ikon belum ada)
// tidak menggagalkan seluruh proses install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        URLS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Gagal cache (dilewati, tidak fatal):', url, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first untuk data live (Firebase/GEE), cache-first untuk shell
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Jangan cache request ke Firebase/Firestore/Google APIs — selalu ambil live
  if (
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('firestore') ||
    url.includes('earthengine')
  ) {
    return; // biarkan browser handle langsung, tanpa intercept
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // Fallback offline sederhana untuk halaman utama
          if (event.request.mode === 'navigate') {
            return caches.match('/map-sar-dashboard.html');
          }
        })
      );
    })
  );
});
