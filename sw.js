// Service Worker temporairement désactivé
console.log('Service Worker: Temporairement désactivé');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});
