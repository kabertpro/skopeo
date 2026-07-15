/* ============================================================
   SKOPEO — Service Worker mínimo (solo para instalabilidad PWA)
   No cachea agresivamente porque la app depende de datos en vivo
   de Supabase — solo cachea el "shell" estático como respaldo.
   ============================================================ */

const CACHE_NAME = 'skopeo-shell-v1';
const SHELL_FILES = [
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/auth.js',
  './js/credits.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first: siempre intenta traer lo último; si no hay internet,
  // recurre a lo que haya en caché (solo el shell estático).
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
