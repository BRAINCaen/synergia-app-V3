// src/js/main.js
// Point d'entrée principal de SYNERGIA v3.0

import { App } from './core/App.js';
import { Logger } from './utils/Logger.js';

// Configuration globale
const CONFIG = {
    version: '3.0.0',
    environment: import.meta.env.DEV ? 'development' : 'production',
    debug: import.meta.env.DEV,
    firebase: {
        apiKey: "AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8",
        authDomain: "synergia-app-f27e7.firebaseapp.com",
        projectId: "synergia-app-f27e7",
        storageBucket: "synergia-app-f27e7.appspot.com",
        messagingSenderId: "201912738922",
        appId: "1:201912738922:web:2fcc1e49293bb632899613",
        measurementId: "G-EGJ79SCMWX"
    }
};

// Logger global
const logger = new Logger('SYNERGIA', CONFIG.debug);

/**
 * Gestionnaire d'erreurs global
 */
window.addEventListener('error', (event) => {
    logger.error('Erreur globale:', event.error);
    
    // Afficher erreur en développement
    if (CONFIG.debug) {
        console.error('Erreur détaillée:', event);
    }
    
    // En production, logger vers service externe
    if (CONFIG.environment === 'production') {
        // TODO: Intégrer service de monitoring (Sentry, etc.)
    }
});

/**
 * Gestionnaire des promesses rejetées
 */
window.addEventListener('unhandledrejection', (event) => {
    logger.error('Promise rejetée:', event.reason);
    event.preventDefault(); // Évite les erreurs console en dev
});

/**
 * Animation de la barre de progression du loading
 */
function animateLoadingProgress() {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;
    
    let progress = 0;
    const steps = [
        { percent: 20, duration: 300, label: 'Chargement des modules...' },
        { percent: 40, duration: 400, label: 'Configuration Firebase...' },
        { percent: 60, duration: 500, label: 'Initialisation des managers...' },
        { percent: 80, duration: 300, label: 'Préparation de l\'interface...' },
        { percent: 100, duration: 200, label: 'Finalisation...' }
    ];
    
    let currentStep = 0;
    
    function nextStep() {
        if (currentStep >= steps.length) return;
        
        const step = steps[currentStep];
        progress = step.percent;
        
        progressBar.style.width = `${progress}%`;
        
        // Mettre à jour le texte si disponible
        const statusElement = document.querySelector('.loading-content p');
        if (statusElement && step.label) {
            statusElement.textContent = step.label;
        }
        
        currentStep++;
        
        if (currentStep < steps.length) {
            setTimeout(nextStep, step.duration);
        }
    }
    
    // Démarrer l'animation
    setTimeout(nextStep, 100);
}

/**
 * Masquer l'écran de chargement
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app');
    
    if (loadingScreen && appContainer) {
        // Animation de sortie
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            appContainer.style.display = 'grid';
            
            // Animation d'entrée de l'app
            appContainer.style.opacity = '0';
            appContainer.style.transform = 'translateY(20px)';
            
            requestAnimationFrame(() => {
                appContainer.style.transition = 'all 0.5s ease';
                appContainer.style.opacity = '1';
                appContainer.style.transform = 'translateY(0)';
            });
        }, 300);
    }
}

/**
 * Gestionnaire de performance
 */
function initPerformanceMonitoring() {
    // Mesurer les métriques de performance
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
                
                logger.info('Performance:', {
                    loadTime: `${loadTime}ms`,
                    domContentLoaded: `${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`,
                    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 'N/A'
                });
                
                // Analytics de performance
                if (window.gtag) {
                    gtag('event', 'page_load_time', {
                        value: Math.round(loadTime)
                    });
                }
            }, 0);
        });
    }
}

/**
 * Détection des capacités du navigateur
 */
function detectBrowserCapabilities() {
    const capabilities = {
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        webRTC: 'RTCPeerConnection' in window,
        geolocation: 'geolocation' in navigator,
        camera: 'mediaDevices' in navigator,
        storage: {
            localStorage: 'localStorage' in window,
            indexedDB: 'indexedDB' in window,
            webSQL: 'openDatabase' in window
        },
        graphics: {
            canvas: 'getContext' in document.createElement('canvas'),
            webGL: !!document.createElement('canvas').getContext('webgl')
        }
    };
    
    logger.info('Capacités du navigateur:', capabilities);
    
    // Stocker pour usage par les managers
    window.SYNERGIA_CAPABILITIES = capabilities;
    
    // Avertissements pour les fonctionnalités manquantes critiques
    if (!capabilities.localStorage) {
        logger.warn('localStorage non disponible - fonctionnalités limitées');
    }
    
    if (!capabilities.serviceWorker) {
        logger.warn('Service Worker non supporté - pas de mode hors ligne');
    }
    
    return capabilities;
}

/**
 * Configuration PWA
 */
function initPWA() {
    // Manifest
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                logger.info('Service Worker enregistré:', registration);
                
                // Vérifier les mises à jour
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nouvelle version disponible
                            logger.info('Nouvelle version de l\'app disponible');
                            
                            // TODO: Afficher notification de mise à jour
                            if (window.SYNERGIA?.notificationManager) {
                                window.SYNERGIA.notificationManager.showUpdateNotification();
                            }
                        }
                    });
                });
                
            } catch (error) {
                logger.error('Erreur Service Worker:', error);
            }
        });
    }
    
    // Événement d'installation PWA
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // TODO: Afficher bouton d'installation personnalisé
        logger.info('PWA installable détectée');
    });
}

/**
 * Initialisation de l'application
 */
async function initApp() {
    try {
        logger.info(`🚀 Démarrage SYNERGIA v${CONFIG.version}`);
        logger.info(`Environnement: ${CONFIG.environment}`);
        
        // Démarrer l'animation de chargement
        animateLoadingProgress();
        
        // Détection des capacités
        const capabilities = detectBrowserCapabilities();
        
        // Configuration PWA
        initPWA();
        
        // Monitoring de performance
        initPerformanceMonitoring();
        
        // Initialiser l'application principale
        const app = new App(CONFIG);
        
        // Exposer globalement pour le debug
        if (CONFIG.debug) {
            window.SYNERGIA = app;
            window.CONFIG = CONFIG;
            logger.info('🔧 Mode debug activé - App disponible sur window.SYNERGIA');
        }
        
        // Initialiser l'app
        await app.init();
        
        // Masquer le loading après initialisation
        setTimeout(hideLoadingScreen, 800);
        
        logger.info('✅ SYNERGIA initialisé avec succès');
        
    } catch (error) {
        logger.error('❌ Erreur lors de l\'initialisation:', error);
        
        // Afficher erreur à l'utilisateur
        showCriticalError(error);
    }
}

/**
 * Affichage d'erreur critique
 */
function showCriticalError(error) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: white; max-width: 500px; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; margin-bottom: 2rem; color: #ef4444;"></i>
                <h1>Erreur de démarrage</h1>
                <p>Une erreur critique a empêché le démarrage de SYNERGIA.</p>
                ${CONFIG.debug ? `
                    <details style="margin-top: 2rem; text-align: left;">
                        <summary>Détails de l'erreur (mode debug)</summary>
                        <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; overflow: auto; margin-top: 1rem;">${error.stack || error.message}</pre>
                    </details>
                ` : ''}
                <button onclick="location.reload()" style="margin-top: 2rem; padding: 1rem 2rem; background: #6d28d9; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    Recharger l'application
                </button>
            </div>
        `;
    }
}

/**
 * Démarrage de l'application
 */
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM prêt, initialisation de l\'application...');
    initApp();
});

// Gestion du rechargement de page
window.addEventListener('beforeunload', () => {
    if (window.SYNERGIA) {
        logger.info('Nettoyage avant fermeture...');
        window.SYNERGIA.cleanup();
    }
});

// Export pour les tests
export { CONFIG, initApp };