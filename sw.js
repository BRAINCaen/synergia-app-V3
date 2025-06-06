// sw.js - Service Worker SYNERGIA v3.0 - Version minimale sans erreurs

const CACHE_NAME = 'synergia-v3-minimal';

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation (version minimale)');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cache ouvert');
        // Ne pas utiliser addAll(), mais juste ouvrir le cache
        return Promise.resolve();
      })
      .then(() => {
        console.log('✅ Service Worker: Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur installation:', error);
        // Ne pas faire échouer l'installation
        return Promise.resolve();
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation');
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('synergia-')) {
              console.log('🗑️ Service Worker: Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Prendre le contrôle
      self.clients.claim()
    ])
    .then(() => {
      console.log('✅ Service Worker: Activation terminée');
    })
    .catch((error) => {
      console.error('❌ Service Worker: Erreur activation:', error);
    })
  );
});

// Interception des requêtes - Stratégie simple
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les APIs externes
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('chrome-extension://')) {
    return;
  }

  event.respondWith(
    handleFetch(event.request)
      .catch((error) => {
        console.warn('⚠️ Service Worker: Erreur fetch:', error.message);
        return handleFetchError(event.request);
      })
  );
});

// Gestion simple des requêtes
async function handleFetch(request) {
  try {
    // Essayer le réseau en premier
    const networkResponse = await fetch(request);
    
    // Si succès, mettre en cache pour les ressources statiques
    if (networkResponse && networkResponse.status === 200 && isStaticResource(request.url)) {
      try {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.warn('⚠️ Impossible de mettre en cache:', request.url);
      }
    }
    
    return networkResponse;
    
  } catch (networkError) {
    // Si le réseau échoue, essayer le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📦 Service Worker: Depuis le cache:', request.url);
      return cachedResponse;
    }
    
    // Si rien dans le cache, relancer l'erreur
    throw networkError;
  }
}

// Vérifier si c'est une ressource statique
function isStaticResource(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.html'];
  const urlObj = new URL(url);
  
  return staticExtensions.some(ext => urlObj.pathname.endsWith(ext)) ||
         urlObj.pathname === '/' ||
         urlObj.pathname.startsWith('/src/') ||
         urlObj.pathname.startsWith('/assets/');
}

// Gestion des erreurs de fetch
async function handleFetchError(request) {
  // Pour les pages HTML, retourner une page d'erreur simple
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    return new Response(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SYNERGIA - Hors ligne</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }
          h1 { margin-bottom: 20px; }
          button { 
            padding: 10px 20px; 
            font-size: 16px; 
            background: #e94560; 
            color: white; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
            margin-top: 20px;
          }
          button:hover { background: #d63651; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🌐 SYNERGIA</h1>
          <h2>Application temporairement hors ligne</h2>
          <p>Vérifiez votre connexion internet et réessayez.</p>
          <button onclick="window.location.reload()">🔄 Réessayer</button>
          <button onclick="window.location.href='/'">🏠 Accueil</button>
        </div>
      </body>
      </html>
    `, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // Pour les autres ressources, retourner une erreur simple
  return new Response('Ressource non disponible', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    caches.delete(CACHE_NAME)
      .then(() => {
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
      .catch((error) => {
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error.message });
        }
      });
  }
});

// Gestion des erreurs globales
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker: Erreur globale:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker: Promise rejetée:', event.reason);
  event.preventDefault();
});

console.log('📜 Service Worker: Version minimale chargée');
