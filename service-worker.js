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
/**
 * TAMBAHKAN kode ini ke AKHIR file service-worker.js yang SUDAH ADA di repo
 * (jangan timpa/hapus isi yang sudah ada -- ini cuma tambahan baru).
 *
 * Fungsi: begitu ada push notification masuk dari Worker (scie-notify-worker),
 * event 'push' ini akan aktif MESKIPUN tab/web dashboard sedang tertutup --
 * karena Service Worker memang dirancang browser untuk tetap "hidup" di
 * latar belakang menunggu event seperti ini.
 */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { notification: { title: 'SCIE Dashboard', body: 'Ada pesan baru' } };
  }

  const judul = (data.notification && data.notification.title) || 'SCIE Dashboard';
  const opsi = {
    body: (data.notification && data.notification.body) || 'Ada pesan baru',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200], // getar HP saat notifikasi masuk
    data: { url: '/map-sar-dashboard' }
  };

  event.waitUntil(self.registration.showNotification(judul, opsi));
});

// Begitu notifikasi DIKETUK, buka/fokuskan tab dashboard yang sesuai
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/map-sar-dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/map-sar-dashboard');
      }
    })
  );
});
    
