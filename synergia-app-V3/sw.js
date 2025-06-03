// Service Worker pour SYNERGIA v3.0
const CACHE_NAME = 'synergia-v3.0.0';
const OFFLINE_URL = '/offline.html';

// Ressources à mettre en cache
const CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  
  // CSS
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/modules/planning.css',
  '/css/modules/notifications.css',
  
  // JavaScript Core
  '/js/utils/constants.js',
  '/js/utils/helpers.js',
  '/js/utils/validators.js',
  '/js/core/firebase-manager.js',
  '/js/core/data-manager.js',
  '/js/core/ui-manager.js',
  '/js/core/router.js',
  
  // JavaScript Modules
  '/js/modules/notifications/notification-manager.js',
  '/js/modules/team/team-manager.js',
  '/js/modules/quests/quest-manager.js',
  '/js/modules/planning/planning-manager.js',
  '/js/modules/badging/badging-manager.js',
  '/js/modules/chat/chat-manager.js',
  
  // Assets
  '/assets/images/default-avatar.jpg',
  '/assets/sounds/notification.mp3',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  
  // Polices et librairies externes
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des ressources');
        return cache.addAll(CACHE_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors de l\'installation:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Suppression du cache obsolète:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-HTTP
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Stratégie Cache First pour les ressources statiques
  if (isStaticResource(event.request.url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  
  // Stratégie Network First pour les données API
  if (isApiRequest(event.request.url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Stratégie Network First avec fallback offline pour les pages
  event.respondWith(networkFirstWithOffline(event.request));
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue');
  
  const options = {
    body: 'Vous avez reçu une nouvelle notification SYNERGIA',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir SYNERGIA',
        icon: '/assets/icons/open-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Ignorer',
        icon: '/assets/icons/dismiss-icon.png'
      }
    ],
    requireInteraction: true,
    silent: false
  };
  
  // Personnaliser avec les données reçues
  if (event.data) {
    try {
      const data = event.data.json();
      options.title = data.title || 'SYNERGIA';
      options.body = data.body || options.body;
      options.icon = data.icon || options.icon;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.error('[SW] Erreur parsing notification data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title || 'SYNERGIA', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification');
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Chercher une fenêtre existante
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        // Ouvrir une nouvelle fenêtre
        return clients.openWindow(targetUrl);
      })
  );
});

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  console.log('[SW] Synchronisation:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Fonctions utilitaires

function isStaticResource(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.includes(ext)) || 
         url.includes('cdnjs.cloudflare.com') || 
         url.includes('fonts.googleapis.com');
}

function isApiRequest(url) {
  return url.includes('/api/') || 
         url.includes('firestore') || 
         url.includes('firebase');
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Ressource servie depuis le cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Erreur réseau pour:', request.url, error);
    throw error;
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Réseau indisponible, utilisation du cache pour:', request.url);
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

async function networkFirstWithOffline(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('[SW] Réseau indisponible, utilisation du cache pour:', request.url);
    
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Si c'est une page et qu'elle n'est pas en cache, retourner la page offline
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match(OFFLINE_URL);
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

async function doBackgroundSync() {
  try {
    console.log('[SW] Synchronisation en arrière-plan');
    
    // Récupérer les données en attente de synchronisation
    const pendingData = await getIndexedDBData('pendingSync');
    
    if (pendingData && pendingData.length > 0) {
      for (const item of pendingData) {
        try {
          await syncDataItem(item);
          await removeFromIndexedDB('pendingSync', item.id);
        } catch (error) {
          console.error('[SW] Erreur sync item:', error);
        }
      }
    }
    
    console.log('[SW] Synchronisation terminée');
  } catch (error) {
    console.error('[SW] Erreur synchronisation:', error);
  }
}

async function syncDataItem(item) {
  // Logique de synchronisation des données
  // À adapter selon vos besoins métier
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(item)
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
  
  return response.json();
}

// Helpers IndexedDB (à implémenter selon vos besoins)
async function getIndexedDBData(storeName) {
  // Implémentation IndexedDB
  return [];
}

async function removeFromIndexedDB(storeName, id) {
  // Implémentation IndexedDB
  return true;
}

// Message aux clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service Worker SYNERGIA v3.0 chargé');
