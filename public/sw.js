// Service worker minimal: membuat aplikasi bisa dipasang dan menampilkan halaman offline.
// Sengaja TIDAK menyimpan halaman/data keuangan di cache.
const OFFLINE = '/offline.html'
self.addEventListener('install', (e) => { e.waitUntil(caches.open('wt-offline-v1').then((c) => c.add(OFFLINE))); self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)))
})
