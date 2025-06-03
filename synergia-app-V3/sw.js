const CACHE_NAME = 'synergia-v3.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/mobile-fixes.css',
  '/css/modules/chat.css',
  '/css/modules/planning.css',
  '/css/modules/badging.css',
  '/css/modules/notifications.css',
  '/js/app.js',
  '/js/core/firebase-manager.js',
  '/js/core/ui-manager.js',
  '/js/core/data-manager.js',
  '/js/core/router.js',
  '/js/modules/team/team-manager.js',
  '/js/modules/team/team-ui.js',
  '/js/modules/quests/quest-manager.js',
  '/js/modules/quests/quest-ui.js',
  '/js/modules/chat/chat-manager.js',
  '/js/modules/chat/chat-ui.js',
  '/js/modules/planning/planning-manager.js',
  '/js/modules/planning/planning-ui.js',
  '/js/modules/badging/badging-manager.js',
  '/js/modules/badging/badging-ui.js',
  '/js/modules/notifications/notification-manager.js',
  '/assets/images/default-avatar.jpg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Erreur cache:', error);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  if (event.request.url.includes('firebaseapp.com') || 
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});