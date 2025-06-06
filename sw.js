// sw.js - DÉSACTIVATION TEMPORAIRE DU SERVICE WORKER
// Cette version désactive complètement le service worker pour éviter les erreurs

console.log('🛑 Service Worker: Version désactivée temporairement');

// Installation simplifiée - pas de cache
self.addEventListener('install', (event) => {
  console.log('⚙️ Service Worker: Installation sans cache');
  event.waitUntil(self.skipWaiting());
});

// Activation simplifiée - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activation et nettoyage');
  
  event.waitUntil(
    Promise.all([
      // Supprimer TOUS les anciens caches pour éviter les conflits
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ Suppression du cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ])
    .then(() => {
      console.log('✅ Service Worker: Nettoyage terminé');
    })
    .catch((error) => {
      console.log('⚠️ Service Worker: Erreur lors du nettoyage:', error);
    })
  );
});

// Pas d'interception des requêtes - laisser passer toutes les requêtes
self.addEventListener('fetch', (event) => {
  // Ne rien faire - laisser le navigateur gérer normalement
  return;
});

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker: Mode désactivé - toutes les requêtes passent par le réseau');
