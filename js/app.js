// js/app.js
// Point d'entrée principal de SYNERGIA v3.0

/**
 * Application principale SYNERGIA
 */
class SynergiaApp {
    constructor() {
        this.version = '3.0.0';
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.modules = new Map();
        this.startTime = Date.now();
        
        console.log(`🚀 Initialisation de SYNERGIA v${this.version}`);
        
        this.init();
    }

    async init() {
        try {
            // Attendre que le DOM soit prêt
            await this.waitForDOM();
            
            // Afficher l'écran de chargement
            this.showLoadingScreen();
            
            // Initialiser les modules core
            await this.initializeCore();
            
            // Initialiser les modules métier
            await this.initializeModules();
            
            // Configurer l'application
            await this.configure();
            
            // Démarrer l'application
            await this.start();
            
            // Masquer l'écran de chargement
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            
            const loadTime = Date.now() - this.startTime;
            console.log(`✅ SYNERGIA initialisé en ${loadTime}ms`);
            
            // Dispatcher l'événement d'initialisation
            document.dispatchEvent(new CustomEvent('app:ready', {
                detail: { version: this.version, loadTime }
            }));
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showErrorScreen(error);
        }
    }

    async waitForDOM() {
        if (document.readyState === 'loading') {
            return new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            
            // Animer le texte de chargement
            const loadingText = loadingScreen.querySelector('.loading-text');
            if (loadingText) {
                const texts = [
                    'Initialisation de la plateforme...',
                    'Connexion à Firebase...',
                    'Chargement des modules...',
                    'Configuration de l\'interface...',
                    'Préparation des données...',
                    'Finalisation...'
                ];
                
                let index = 0;
                const interval = setInterval(() => {
                    if (index < texts.length) {
                        loadingText.textContent = texts[index];
                        index++;
                    } else {
                        clearInterval(interval);
                    }
                }, 500);
                
                // Stocker l'interval pour pouvoir l'arrêter
                this.loadingInterval = interval;
            }
        }
    }

    hideLoadingScreen() {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }
        
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    }

    async initializeCore() {
        console.log('🔧 Initialisation des modules core...');
        
        // Attendre que Firebase soit prêt
        if (window.firebaseManager) {
            await window.firebaseManager.waitForReady();
            this.modules.set('firebase', window.firebaseManager);
        }
        
        // Router
        if (window.router) {
            this.modules.set('router', window.router);
        }
        
        // UI Manager  
        if (window.uiManager) {
            this.modules.set('ui', window.uiManager);
        }
        
        // Data Manager
        if (window.dataManager) {
            await window.dataManager.init();
            this.modules.set('data', window.dataManager);
        }
        
        console.log('✅ Modules core initialisés');
    }

    async initializeModules() {
        console.log('📦 Chargement des modules métier...');
        
        const modulePromises = [];
        
        // Team Manager (déjà initialisé dans index.html)
        if (window.teamManager) {
            this.modules.set('team', window.teamManager);
        }
        
        // Badging Manager (déjà initialisé dans index.html)
        if (window.badgingManager) {
            this.modules.set('badging', window.badgingManager);
        }
        
        // Quest Manager (à implémenter)
        if (window.questManager) {
            modulePromises.push(
                window.questManager.init().then(() => {
                    this.modules.set('quests', window.questManager);
                })
            );
        }
        
        // Planning Manager (à implémenter)
        if (window.planningManager) {
            modulePromises.push(
                window.planningManager.init().then(() => {
                    this.modules.set('planning', window.planningManager);
                })
            );
        }
        
        // Chat Manager (à implémenter)
        if (window.chatManager) {
            modulePromises.push(
                window.chatManager.init().then(() => {
                    this.modules.set('chat', window.chatManager);
                })
            );
        }
        
        // Notification Manager (à implémenter)
        if (window.notificationManager) {
            modulePromises.push(
                window.notificationManager.init().then(() => {
                    this.modules.set('notifications', window.notificationManager);
                })
            );
        }
        
        await Promise.allSettled(modulePromises);
        console.log('✅ Modules métier chargés');
    }

    async configure() {
        console.log('⚙️ Configuration de l\'application...');
        
        // Configurer les événements globaux
        this.setupGlobalEvents();
        
        // Configurer la gestion d'erreurs
        this.setupErrorHandling();
        
        // Configurer la gestion hors ligne
        this.setupOfflineHandling();
        
        // Configurer les raccourcis clavier
        this.setupKeyboardShortcuts();
        
        // Configurer le Service Worker
        await this.setupServiceWorker();
        
        console.log('✅ Configuration terminée');
    }

    async start() {
        console.log('🎯 Démarrage de l\'application...');
        
        // Vérifier l'authentification
        const isAuthenticated = window.firebaseManager?.currentUser;
        
        if (isAuthenticated) {
            // Utilisateur connecté - charger les données
            await this.loadUserData();
            
            // Naviguer vers la page appropriée
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath === '/login') {
                if (window.router) {
                    window.router.navigate('/dashboard');
                }
            }
        } else {
            // Utilisateur non connecté - mode démo ou connexion
            console.log('👤 Mode démo - utilisateur non connecté');
            this.setupDemoMode();
        }
        
        console.log('✅ Application démarrée');
    }

    async loadUserData() {
        try {
            const userData = await window.firebaseManager.getCurrentUserData();
            if (userData) {
                // Mettre à jour l'interface utilisateur
                if (window.uiManager) {
                    window.uiManager.updateUserHeader(userData);
                }
                
                // Charger les données de l'équipe
                if (window.teamManager) {
                    await window.teamManager.refreshTeamData();
                }
                
                console.log('✅ Données utilisateur chargées');
            }
        } catch (error) {
            console.error('❌ Erreur chargement données utilisateur:', error);
        }
    }

    setupDemoMode() {
        console.log('🎭 Configuration du mode démo');
        
        // Charger des données d'exemple
        if (window.teamManager) {
            window.teamManager.loadSampleData();
        }
        
        if (window.badgingManager) {
            // Permettre le pointage en mode démo
            window.badgingManager.demoMode = true;
        }
    }

    setupGlobalEvents() {
        // Événements Firebase
        document.addEventListener('firebase:ready', () => {
            console.log('🔥 Firebase prêt');
        });
        
        // Événements d'authentification
        document.addEventListener('auth:login', (e) => {
            console.log('👤 Utilisateur connecté');
            this.loadUserData();
        });
        
        document.addEventListener('auth:logout', () => {
            console.log('👤 Utilisateur déconnecté');
            if (window.router) {
                window.router.navigate('/login');
            }
        });
        
        // Événements de page
        document.addEventListener('page:change', (e) => {
            console.log('📄 Changement de page:', e.detail.page);
            
            // Analytics
            if (window.firebaseManager?.analytics) {
                window.firebaseManager.analytics.logEvent('page_view', {
                    page_name: e.detail.page
                });
            }
        });
        
        // Événements de données
        document.addEventListener('data:sync', () => {
            console.log('🔄 Synchronisation des données');
        });
    }

    setupErrorHandling() {
        // Erreurs JavaScript globales
        window.addEventListener('error', (event) => {
            console.error('❌ Erreur JavaScript:', event.error);
            this.handleError(event.error, 'JavaScript Error');
        });
        
        // Promesses rejetées
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Promise rejetée:', event.reason);
            this.handleError(event.reason, 'Unhandled Promise Rejection');
        });
        
        // Erreurs Firebase
        if (window.firebaseManager) {
            window.firebaseManager.on('error', (error) => {
                this.handleError(error, 'Firebase Error');
            });
        }
    }

    setupOfflineHandling() {
        // Événements de connexion
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Connexion rétablie');
            this.showToast('Connexion rétablie', 'success');
            
            // Synchroniser les données
            if (window.dataManager) {
                window.dataManager.syncOfflineData();
            }
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📡 Connexion perdue');
            this.showToast('Mode hors ligne activé', 'warning');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K pour la recherche
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openQuickSearch();
            }
            
            // Ctrl/Cmd + H pour l'accueil
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                if (window.router) {
                    window.router.navigate('/dashboard');
                }
            }
            
            // Escape pour fermer les modales
            if (e.key === 'Escape') {
                if (window.uiManager) {
                    window.uiManager.closeAllModals();
                }
            }
        });
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker enregistré:', registration.scope);
                
                // Écouter les mises à jour
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // Nouvelle version disponible
                                this.showUpdateNotification();
                            }
                        }
                    });
                });
                
            } catch (error) {
                console.error('❌ Erreur Service Worker:', error);
            }
        }
    }

    handleError(error, context = '') {
        const errorInfo = {
            message: error.message || 'Erreur inconnue',
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: window.firebaseManager?.currentUser?.uid
        };
        
        // Log local
        console.error('❌ Erreur capturée:', errorInfo);
        
        // Envoyer à Firebase Analytics si disponible
        if (window.firebaseManager?.analytics) {
            try {
                window.firebaseManager.analytics.logEvent('exception', {
                    description: errorInfo.message,
                    fatal: false
                });
            } catch (e) {
                console.error('Erreur envoi analytics:', e);
            }
        }
        
        // Afficher une notification à l'utilisateur pour les erreurs critiques
        if (this.isCriticalError(error)) {
            this.showToast('Une erreur est survenue. Veuillez réessayer.', 'error');
        }
    }

    isCriticalError(error) {
        const criticalKeywords = [
            'firebase',
            'network',
            'permission',
            'authentication'
        ];
        
        const message = (error.message || '').toLowerCase();
        return criticalKeywords.some(keyword => message.includes(keyword));
    }

    showErrorScreen(error) {
        const errorScreen = document.createElement('div');
        errorScreen.className = 'error-screen';
        errorScreen.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h1>Oops ! Une erreur est survenue</h1>
                <p>L'application n'a pas pu se charger correctement.</p>
                <details>
                    <summary>Détails techniques</summary>
                    <pre>${error.stack || error.message}</pre>
                </details>
                <div class="error-actions">
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        Recharger la page
                    </button>
                    <a href="/debug-index.html" class="btn btn-secondary">
                        Mode debug
                    </a>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorScreen);
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span>🆕 Une nouvelle version est disponible !</span>
                <button onclick="window.location.reload()" class="btn btn-sm btn-primary">
                    Mettre à jour
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-sm btn-secondary">
                    Plus tard
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-masquer après 10 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    openQuickSearch() {
        if (window.uiManager) {
            // TODO: Implémenter la recherche rapide
            this.showToast('Recherche rapide - En développement', 'info');
        }
    }

    showToast(message, type = 'info') {
        if (window.uiManager) {
            window.uiManager.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Méthodes publiques pour l'API
    getModule(name) {
        return this.modules.get(name);
    }

    isReady() {
        return this.isInitialized;
    }

    getVersion() {
        return this.version;
    }

    getLoadTime() {
        return this.isInitialized ? Date.now() - this.startTime : null;
    }

    // Debug et développement
    debug() {
        return {
            version: this.version,
            isInitialized: this.isInitialized,
            isOnline: this.isOnline,
            modules: Array.from(this.modules.keys()),
            loadTime: this.getLoadTime(),
            firebase: window.firebaseManager?.isReady,
            router: window.router?.getCurrentRoute(),
            user: window.firebaseManager?.currentUser?.uid
        };
    }

    // API pour les tests
    async runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            app: this.debug(),
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                online: navigator.onLine,
                cookieEnabled: navigator.cookieEnabled
            },
            performance: {
                loadTime: this.getLoadTime(),
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                } : null
            }
        };
        
        // Tests de connectivité
        try {
            await fetch('/?ping=' + Date.now(), { method: 'HEAD' });
            diagnostics.connectivity = 'OK';
        } catch {
            diagnostics.connectivity = 'FAILED';
        }
        
        // Tests Firebase
        if (window.firebaseManager) {
            diagnostics.firebase = {
                ready: window.firebaseManager.isReady,
                authenticated: !!window.firebaseManager.currentUser,
                connection: await window.firebaseManager.checkConnection()
            };
        }
        
        console.table(diagnostics);
        return diagnostics;
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    window.synergiaApp = new SynergiaApp();
});

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SynergiaApp;
}

// Ajouter les styles pour les écrans d'erreur et notifications
const style = document.createElement('style');
style.textContent = `
    .error-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
    }
    
    .error-content {
        text-align: center;
        max-width: 500px;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        backdrop-filter: blur(10px);
    }
    
    .error-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }
    
    .error-content h1 {
        margin-bottom: 1rem;
        font-size: 2rem;
    }
    
    .error-content p {
        margin-bottom: 2rem;
        opacity: 0.9;
    }
    
    .error-content details {
        text-align: left;
        margin: 1rem 0;
        background: rgba(0, 0, 0, 0.2);
        padding: 1rem;
        border-radius: 8px;
    }
    
    .error-content pre {
        white-space: pre-wrap;
        font-size: 0.8rem;
        max-height: 200px;
        overflow-y: auto;
    }
    
    .error-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    }
    
    .update-content {
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
