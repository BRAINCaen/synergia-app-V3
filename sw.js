// sw.js - Service Worker SYNERGIA v3.0 corrigé

const CACHE_NAME = 'synergia-v3-cache-v1';
const STATIC_CACHE = 'synergia-static-v1';
const DYNAMIC_CACHE = 'synergia-dynamic-v1';

// Ressources à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/src/styles/main.css',
  '/src/styles/variables.css',
  '/src/styles/base.css',
  '/src/styles/components.css',
  '/src/js/main.js',
  '/src/js/app.js',
  '/src/js/config.js',
  '/assets/images/logo.png',
  '/assets/images/favicon.ico'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation démarrée');
  
  event.waitUntil(
    Promise.all([
      // Cache statique
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Service Worker: Cache statique ouvert');
          return cache.addAll(STATIC_ASSETS);
        })
        .catch((error) => {
          console.error('Service Worker: Erreur lors de la mise en cache statique:', error);
          // Ne pas faire échouer l'installation, juste logger l'erreur
          return Promise.resolve();
        }),
      
      // Cache dynamique
      caches.open(DYNAMIC_CACHE)
        .then(() => {
          console.log('Service Worker: Cache dynamique initialisé');
        })
        .catch((error) => {
          console.error('Service Worker: Erreur lors de l\'initialisation du cache dynamique:', error);
          return Promise.resolve();
        })
    ])
    .then(() => {
      console.log('Service Worker: Installation terminée avec succès');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('Service Worker: Erreur générale d\'installation:', error);
    })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation');
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                console.log('Service Worker: Suppression de l\'ancien cache:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        })
        .catch((error) => {
          console.error('Service Worker: Erreur lors du nettoyage des caches:', error);
        }),
      
      // Prendre le contrôle de tous les clients
      self.clients.claim()
        .catch((error) => {
          console.error('Service Worker: Erreur lors de la prise de contrôle:', error);
        })
    ])
    .then(() => {
      console.log('Service Worker: Activation terminée');
    })
    .catch((error) => {
      console.error('Service Worker: Erreur générale d\'activation:', error);
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les requêtes vers des APIs externes
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }
  
  event.respondWith(
    handleFetchRequest(event.request)
      .catch((error) => {
        console.error('Service Worker: Erreur lors de la gestion de la requête:', error);
        
        // Si c'est une requête de navigation et qu'on a une erreur, retourner la page offline
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html')
            .then((response) => response || new Response('Application hors ligne', {
              status: 503,
              statusText: 'Service Unavailable'
            }));
        }
        
        return new Response('Ressource non disponible', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Fonction pour gérer les requêtes
async function handleFetchRequest(request) {
  try {
    // Vérifier d'abord le cache statique
    const staticResponse = await caches.match(request);
    if (staticResponse) {
      return staticResponse;
    }
    
    // Essayer de récupérer depuis le réseau
    const networkResponse = await fetch(request);
    
    // Si la réponse est valide, la mettre en cache dynamique
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      // Cloner la réponse car elle ne peut être lue qu'une fois
      cache.put(request, networkResponse.clone())
        .catch((error) => {
          console.warn('Service Worker: Impossible de mettre en cache:', request.url, error);
        });
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('Service Worker: Erreur réseau pour:', request.url, error);
    
    // Essayer de récupérer depuis le cache dynamique
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si c'est une requête de navigation, retourner la page offline
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Relancer l'erreur si aucune solution trouvée
    throw error;
  }
}

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_CLEAR') {
      clearAllCaches()
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch((error) => {
          console.error('Service Worker: Erreur lors du nettoyage du cache:', error);
          event.ports[0].postMessage({ success: false, error: error.message });
        });
    }
  } catch (error) {
    console.error('Service Worker: Erreur lors du traitement du message:', error);
  }
});

// Fonction pour nettoyer tous les caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('Service Worker: Tous les caches ont été nettoyés');
  } catch (error) {
    console.error('Service Worker: Erreur lors du nettoyage des caches:', error);
    throw error;
  }
}

// Gestion des erreurs non capturées
self.addEventListener('error', (event) => {
  console.error('Service Worker: Erreur non capturée:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Promise rejetée non gérée:', event.reason);
  event.preventDefault();
});

console.log('Service Worker: Script chargé et prêt');
