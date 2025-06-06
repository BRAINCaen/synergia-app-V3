// sw.js - Service Worker SYNERGIA v3.0 - Version corrigée finale

const CACHE_NAME = 'synergia-v3-cache-v2';
const STATIC_CACHE = 'synergia-static-v2';
const DYNAMIC_CACHE = 'synergia-dynamic-v2';

// Ressources essentielles (vérifiées pour exister)
const ESSENTIAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Ressources optionnelles (peuvent ne pas exister)
const OPTIONAL_ASSETS = [
  '/offline.html',
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

// Fonction pour vérifier si une ressource existe
async function checkResourceExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Fonction pour mettre en cache les ressources de manière sécurisée
async function cacheResourcesSafely(cache, resources, isEssential = false) {
  const results = {
    success: [],
    failed: []
  };

  for (const url of resources) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        results.success.push(url);
        console.log(`✅ Cached: ${url}`);
      } else {
        results.failed.push(url);
        if (isEssential) {
          console.error(`❌ Essential resource failed: ${url} (${response.status})`);
        } else {
          console.warn(`⚠️ Optional resource not found: ${url} (${response.status})`);
        }
      }
    } catch (error) {
      results.failed.push(url);
      if (isEssential) {
        console.error(`❌ Essential resource error: ${url}`, error);
      } else {
        console.warn(`⚠️ Optional resource error: ${url}`, error);
      }
    }
  }

  return results;
}

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation démarrée');
  
  event.waitUntil(
    (async () => {
      try {
        // Ouvrir le cache statique
        const cache = await caches.open(STATIC_CACHE);
        console.log('📦 Service Worker: Cache statique ouvert');

        // Mettre en cache les ressources essentielles
        console.log('📋 Mise en cache des ressources essentielles...');
        const essentialResults = await cacheResourcesSafely(cache, ESSENTIAL_ASSETS, true);
        
        // Mettre en cache les ressources optionnelles
        console.log('📋 Mise en cache des ressources optionnelles...');
        const optionalResults = await cacheResourcesSafely(cache, OPTIONAL_ASSETS, false);

        // Logs de résumé
        const totalSuccess = essentialResults.success.length + optionalResults.success.length;
        const totalFailed = essentialResults.failed.length + optionalResults.failed.length;
        
        console.log(`✅ Service Worker: ${totalSuccess} ressources mises en cache avec succès`);
        
        if (totalFailed > 0) {
          console.warn(`⚠️ Service Worker: ${totalFailed} ressources n'ont pas pu être mises en cache`);
        }

        // Vérifier qu'au moins les ressources essentielles sont en cache
        if (essentialResults.failed.length > 0) {
          console.error('❌ Service Worker: Échec de mise en cache des ressources essentielles');
          throw new Error('Ressources essentielles manquantes');
        }

        // Initialiser le cache dynamique
        await caches.open(DYNAMIC_CACHE);
        console.log('📦 Service Worker: Cache dynamique initialisé');

        console.log('✅ Service Worker: Installation terminée avec succès');
        
        // Prendre le contrôle immédiatement
        return self.skipWaiting();
        
      } catch (error) {
        console.error('❌ Service Worker: Erreur critique d\'installation:', error);
        // Ne pas faire échouer l'installation, mais logger l'erreur
        return Promise.resolve();
      }
    })()
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation');
  
  event.waitUntil(
    (async () => {
      try {
        // Nettoyer les anciens caches
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(cacheName => 
            cacheName !== STATIC_CACHE && 
            cacheName !== DYNAMIC_CACHE &&
            cacheName.startsWith('synergia-')
          )
          .map(cacheName => {
            console.log(`🗑️ Service Worker: Suppression de l'ancien cache: ${cacheName}`);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletePromises);
        
        // Prendre le contrôle de tous les clients
        await self.clients.claim();
        
        console.log('✅ Service Worker: Activation terminée');
        
      } catch (error) {
        console.error('❌ Service Worker: Erreur lors de l\'activation:', error);
      }
    })()
  );
});

// Interception des requêtes avec stratégie cache-first pour les ressources statiques
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les APIs externes
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('chrome-extension://')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const url = new URL(event.request.url);
        
        // Stratégie cache-first pour les ressources statiques
        if (isStaticResource(url.pathname)) {
          return await cacheFirstStrategy(event.request);
        }
        
        // Stratégie network-first pour les autres ressources
        return await networkFirstStrategy(event.request);
        
      } catch (error) {
        console.error('❌ Service Worker: Erreur lors du traitement de la requête:', error);
        return await handleFetchError(event.request);
      }
    })()
  );
});

// Vérifier si c'est une ressource statique
function isStaticResource(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  const staticPaths = ['/assets/', '/src/styles/', '/src/js/'];
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         staticPaths.some(path => pathname.startsWith(path)) ||
         pathname === '/' ||
         pathname === '/index.html' ||
         pathname === '/manifest.json';
}

// Stratégie cache-first
async function cacheFirstStrategy(request) {
  try {
    // Vérifier le cache en premier
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si pas en cache, récupérer du réseau et mettre en cache
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(isEssentialResource(request.url) ? STATIC_CACHE : DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(error => {
        console.warn('⚠️ Service Worker: Impossible de mettre en cache:', request.url, error);
      });
    }
    
    return networkResponse;
    
  } catch (error) {
    // Fallback vers le cache si le réseau échoue
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📦 Service Worker: Serving from cache (network failed):', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// Stratégie network-first
async function networkFirstStrategy(request) {
  try {
    // Essayer le réseau en premier
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Mettre en cache si c'est une réponse valide
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(error => {
        console.warn('⚠️ Service Worker: Impossible de mettre en cache:', request.url, error);
      });
    }
    
    return networkResponse;
    
  } catch (error) {
    // Fallback vers le cache si le réseau échoue
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📦 Service Worker: Serving from cache (network failed):', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// Vérifier si c'est une ressource essentielle
function isEssentialResource(url) {
  return ESSENTIAL_ASSETS.some(asset => url.endsWith(asset));
}

// Gestion des erreurs de fetch
async function handleFetchError(request) {
  // Pour les requêtes de navigation, retourner la page offline ou index.html
  if (request.mode === 'navigate') {
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    const indexResponse = await caches.match('/index.html');
    if (indexResponse) {
      return indexResponse;
    }
    
    // Dernière solution : réponse HTML basique
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>SYNERGIA - Hors ligne</title></head>
      <body>
        <h1>Application hors ligne</h1>
        <p>Vérifiez votre connexion internet.</p>
        <button onclick="window.location.reload()">Réessayer</button>
      </body>
      </html>`,
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
  
  // Pour les autres requêtes, retourner une erreur
  return new Response('Ressource non disponible', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
      return;
    }
    
    if (event.data && event.data.type === 'CACHE_CLEAR') {
      clearAllCaches()
        .then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
        .catch((error) => {
          console.error('❌ Service Worker: Erreur lors du nettoyage du cache:', error);
          event.ports[0]?.postMessage({ success: false, error: error.message });
        });
      return;
    }
    
    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
      getCacheStatus()
        .then((status) => {
          event.ports[0]?.postMessage({ success: true, data: status });
        })
        .catch((error) => {
          event.ports[0]?.postMessage({ success: false, error: error.message });
        });
      return;
    }
    
  } catch (error) {
    console.error('❌ Service Worker: Erreur lors du traitement du message:', error);
  }
});

// Fonction pour nettoyer tous les caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('🗑️ Service Worker: Tous les caches ont été nettoyés');
  } catch (error) {
    console.error('❌ Service Worker: Erreur lors du nettoyage des caches:', error);
    throw error;
  }
}

// Fonction pour obtenir le statut du cache
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      status[cacheName] = keys.length;
    }
    
    return status;
  } catch (error) {
    console.error('❌ Service Worker: Erreur lors de la récupération du statut:', error);
    throw error;
  }
}

// Gestion des erreurs non capturées
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker: Erreur non capturée:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker: Promise rejetée non gérée:', event.reason);
  // Empêcher l'affichage de l'erreur dans la console
  event.preventDefault();
});

// Log de chargement
console.log('📜 Service Worker: Script chargé et prêt');

// Auto-nettoyage périodique des caches (toutes les heures)
setInterval(() => {
  caches.keys().then(cacheNames => {
    // Garder seulement les 2 caches les plus récents
    const oldCaches = cacheNames
      .filter(name => name.startsWith('synergia-'))
      .sort()
      .slice(0, -2);
    
    return Promise.all(
      oldCaches.map(cacheName => {
        console.log(`🗑️ Auto-cleanup: Suppression du cache obsolète ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
  }).catch(error => {
    console.warn('⚠️ Erreur lors du nettoyage automatique:', error);
  });
}, 3600000); // 1 heure
