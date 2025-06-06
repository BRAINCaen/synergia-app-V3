// sw.js - Service Worker pour SYNERGIA v3.0

const CACHE_NAME = 'synergia-v3-cache-v1';
const urlsToCache = [
    '/',
    './manifest.json',
    './src/styles/main.css',
    './src/js/main.js',
    './assets/images/favicon.ico',
    './assets/images/logo.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installation');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Cache ouvert');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activation');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Suppression ancien cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - retourner la réponse
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});
