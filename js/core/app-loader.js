// js/core/app-loader.js
// Gestionnaire de chargement optimisé pour SYNERGIA v3.0

class SynergiaAppLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
        this.managers = new Map();
        this.dependencies = new Map();
        this.config = window.SYNERGIA_CONFIG || {};
        this.startTime = performance.now();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        
        // Configuration des dépendances
        this.setupDependencies();
        
        console.log('🔧 App Loader initialisé');
    }

    setupDependencies() {
        // Définir l'ordre et les dépendances des modules
        this.dependencies.set('firebase', {
            scripts: [
                'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
                'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
                'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
                'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js'
            ],
            init: () => this.initializeFirebase(),
            critical: true
        });

        this.dependencies.set('ui-manager', {
            scripts: ['js/core/ui-manager.js'],
            depends: [],
            init: () => this.initializeManager('uiManager', 'UIManager'),
            critical: true
        });

        this.dependencies.set('data-manager', {
            scripts: ['js/core/data-manager.js'],
            depends: ['firebase'],
            init: () => this.initializeManager('dataManager', 'DataManager'),
            critical: true
        });

        this.dependencies.set('firebase-manager', {
            scripts: ['js/core/firebase-manager.js'],
            depends: ['firebase'],
            init: () => this.initializeManager('firebaseManager', 'FirebaseManager'),
            critical: true
        });

        this.dependencies.set('navigation', {
            scripts: ['js/components/navigation.js'],
            depends: ['ui-manager'],
            init: () => this.initializeNavigation(),
            critical: true
        });

        this.dependencies.set('badging-manager', {
            scripts: [
                'js/modules/badging/badging-manager.js',
                'js/modules/badging/badging-init.js'
            ],
            depends: ['firebase-manager', 'ui-manager'],
            init: () => this.initializeManager('badgingManager', 'BadgingManager'),
            critical: false
        });

        this.dependencies.set('team-manager', {
            scripts: ['js/modules/team/team-manager.js'],
            depends: ['firebase-manager'],
            init: () => this.initializeManager('teamManager', 'TeamManager'),
            critical: false
        });

        this.dependencies.set('chat-manager', {
            scripts: ['js/modules/chat/chat-manager.js'],
            depends: ['firebase-manager', 'ui-manager'],
            init: () => this.initializeManager('chatManager', 'ChatManager'),
            critical: false
        });

        this.dependencies.set('planning-manager', {
            scripts: ['js/modules/planning/planning-manager.js'],
            depends: ['firebase-manager', 'team-manager'],
            init: () => this.initializeManager('planningManager', 'PlanningManager'),
            critical: false
        });

        this.dependencies.set('quest-manager', {
            scripts: ['js/modules/quests/quest-manager.js'],
            depends: ['firebase-manager'],
            init: () => this.initializeManager('questManager', 'QuestManager'),
            critical: false
        });

        this.dependencies.set('notification-manager', {
            scripts: ['js/modules/notifications/notification-manager.js'],
            depends: ['firebase-manager'],
            init: () => this.initializeManager('notificationManager', 'NotificationManager'),
            critical: false
        });
    }

    async loadApplication() {
        try {
            console.log('🚀 Démarrage du chargement optimisé de SYNERGIA');
            this.updateLoadingStatus('Initialisation...', 0);

            // Phase 1: Modules critiques
            await this.loadCriticalModules();

            // Phase 2: Modules non-critiques (en arrière-plan)
            this.loadNonCriticalModules();

            // Phase 3: Finalisation
            await this.finalizeApplication();

        } catch (error) {
            console.error('❌ Erreur critique lors du chargement:', error);
            this.handleCriticalError(error);
        }
    }

    async loadCriticalModules() {
        console.log('📦 Chargement des modules critiques...');
        this.updateLoadingStatus('Chargement des composants essentiels...', 10);

        const criticalModules = Array.from(this.dependencies.entries())
            .filter(([name, config]) => config.critical)
            .map(([name]) => name);

        let progress = 10;
        const progressIncrement = 60 / criticalModules.length;

        for (const moduleName of criticalModules) {
            try {
                await this.loadModule(moduleName);
                progress += progressIncrement;
                this.updateLoadingStatus(`${moduleName} chargé...`, progress);
            } catch (error) {
                console.error(`❌ Erreur chargement module critique ${moduleName}:`, error);
                throw error;
            }
        }

        console.log('✅ Modules critiques chargés');
    }

    async loadNonCriticalModules() {
        console.log('📦 Chargement des modules non-critiques en arrière-plan...');

        const nonCriticalModules = Array.from(this.dependencies.entries())
            .filter(([name, config]) => !config.critical)
            .map(([name]) => name);

        // Charger en parallèle (non-bloquant)
        nonCriticalModules.forEach(async (moduleName) => {
            try {
                await this.loadModule(moduleName);
                console.log(`✅ Module ${moduleName} chargé en arrière-plan`);
                
                // Événement pour signaler qu'un module est prêt
                document.dispatchEvent(new CustomEvent('module:loaded', {
                    detail: { moduleName, timestamp: Date.now() }
                }));
            } catch (error) {
                console.warn(`⚠️ Erreur chargement module ${moduleName}:`, error);
                // Les modules non-critiques peuvent échouer sans crash
                this.scheduleRetry(moduleName);
            }
        });
    }

    async loadModule(moduleName) {
        // Éviter le double chargement
        if (this.loadedModules.has(moduleName)) {
            return;
        }

        // Utiliser le cache des promesses pour éviter les doublons
        if (this.loadingPromises.has(moduleName)) {
            return await this.loadingPromises.get(moduleName);
        }

        const moduleConfig = this.dependencies.get(moduleName);
        if (!moduleConfig) {
            throw new Error(`Module ${moduleName} non trouvé dans la configuration`);
        }

        const loadingPromise = this.executeModuleLoad(moduleName, moduleConfig);
        this.loadingPromises.set(moduleName, loadingPromise);

        try {
            await loadingPromise;
            this.loadedModules.add(moduleName);
            this.loadingPromises.delete(moduleName);
            return true;
        } catch (error) {
            this.loadingPromises.delete(moduleName);
            throw error;
        }
    }

    async executeModuleLoad(moduleName, config) {
        // Charger les dépendances d'abord
        if (config.depends && config.depends.length > 0) {
            await Promise.all(config.depends.map(dep => this.loadModule(dep)));
        }

        // Charger les scripts
        if (config.scripts && config.scripts.length > 0) {
            await Promise.all(config.scripts.map(script => this.loadScript(script)));
        }

        // Exécuter l'initialisation
        if (config.init) {
            await config.init();
        }

        console.log(`✅ Module ${moduleName} chargé et initialisé`);
    }

    async initializeFirebase() {
        try {
            // Firebase devrait déjà être chargé par le script inline
            if (window.firebaseReady) {
                console.log('✅ Firebase déjà initialisé');
                return;
            }

            // Import des modules Firebase
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth, connectAuthEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { getFirestore, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { getStorage } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

            // Initialisation Firebase
            window.firebaseApp = initializeApp(this.config.firebase);
            window.auth = getAuth(window.firebaseApp);
            window.db = getFirestore(window.firebaseApp);
            window.storage = getStorage(window.firebaseApp);

            // Émulateurs en mode développement
            if (this.config.debug && window.location.hostname === 'localhost') {
                try {
                    connectAuthEmulator(window.auth, "http://localhost:9099");
                    connectFirestoreEmulator(window.db, 'localhost', 8080);
                    console.log('🔧 Émulateurs Firebase connectés');
                } catch (e) {
                    console.log('ℹ️ Émulateurs non disponibles, utilisation de Firebase en ligne');
                }
            }

            window.firebaseReady = true;
            document.dispatchEvent(new CustomEvent('firebase:ready'));
            
            console.log('✅ Firebase initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur initialisation Firebase:', error);
            throw error;
        }
    }

    async initializeManager(managerName, managerClass) {
        try {
            // Vérifier que la classe existe
            if (typeof window[managerClass] !== 'function') {
                throw new Error(`Classe ${managerClass} non trouvée`);
            }

            // Créer l'instance
            const manager = new window[managerClass]();
            window[managerName] = manager;
            this.managers.set(managerName, manager);

            // Initialiser si méthode init disponible
            if (typeof manager.init === 'function') {
                await manager.init();
            }

            console.log(`✅ Manager ${managerName} initialisé`);
            return manager;
        } catch (error) {
            console.error(`❌ Erreur initialisation ${managerName}:`, error);
            throw error;
        }
    }

    async initializeNavigation() {
        // Logique d'initialisation de la navigation
        if (window.NavigationComponent) {
            window.navigation = new window.NavigationComponent();
            await window.navigation.init();
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Vérifier si le script est déjà chargé
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
                console.log(`📜 Script chargé: ${src}`);
                resolve();
            };
            
            script.onerror = () => {
                const error = new Error(`Échec du chargement du script: ${src}`);
                console.error('❌', error.message);
                reject(error);
            };

            document.head.appendChild(script);
        });
    }

    loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            // Vérifier si la feuille de style est déjà chargée
            const existing = document.querySelector(`link[href="${href}"]`);
            if (existing) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            
            link.onload = () => {
                console.log(`🎨 Stylesheet chargée: ${href}`);
                resolve();
            };
            
            link.onerror = () => {
                const error = new Error(`Échec du chargement de la stylesheet: ${href}`);
                console.error('❌', error.message);
                reject(error);
            };

            document.head.appendChild(link);
        });
    }

    async scheduleRetry(moduleName) {
        const attempts = this.retryAttempts.get(moduleName) || 0;
        
        if (attempts < this.maxRetries) {
            this.retryAttempts.set(moduleName, attempts + 1);
            const delay = Math.pow(2, attempts) * 1000; // Backoff exponentiel
            
            console.log(`🔄 Nouvelle tentative pour ${moduleName} dans ${delay}ms (tentative ${attempts + 1})`);
            
            setTimeout(async () => {
                try {
                    await this.loadModule(moduleName);
                    this.retryAttempts.delete(moduleName);
                } catch (error) {
                    console.warn(`⚠️ Échec de la tentative ${attempts + 1} pour ${moduleName}`);
                    this.scheduleRetry(moduleName);
                }
            }, delay);
        } else {
            console.error(`❌ Module ${moduleName} définitivement inaccessible après ${this.maxRetries} tentatives`);
        }
    }

    async finalizeApplication() {
        const loadTime = performance.now() - this.startTime;
        
        this.updateLoadingStatus('Finalisation...', 90);
        
        // Attendre un peu que les gestionnaires soient prêts
        await new Promise(resolve => setTimeout(resolve, 500));

        this.updateLoadingStatus('Application prête !', 100);
        
        // Masquer l'écran de chargement
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showApplication();
        }, 500);

        // Événement global
        document.dispatchEvent(new CustomEvent('app:ready', {
            detail: {
                loadTime: Math.round(loadTime),
                loadedModules: Array.from(this.loadedModules),
                version: this.config.version
            }
        }));

        console.log(`🎉 SYNERGIA v${this.config.version} prêt en ${Math.round(loadTime)}ms`);
        console.log(`📊 Modules chargés: ${this.loadedModules.size}`);
    }

    updateLoadingStatus(message, progress = null) {
        const statusEl = document.getElementById('loading-status');
        const progressBar = document.getElementById('loading-bar');
        const detailsEl = document.getElementById('loading-details');

        if (statusEl) statusEl.textContent = message;
        if (detailsEl) detailsEl.textContent = message;
        
        if (progress !== null && progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    showApplication() {
        const navbar = document.getElementById('navbar');
        const mainContent = document.getElementById('main-content');
        
        if (navbar) {
            navbar.style.display = 'block';
            navbar.style.animation = 'fadeIn 0.5s ease';
        }
        
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.animation = 'fadeIn 0.5s ease';
        }

        // Initialiser l'interface par défaut
        this.initializeDefaultInterface();
    }

    initializeDefaultInterface() {
        // Charger la page dashboard par défaut
        if (window.uiManager) {
            window.uiManager.showPage('dashboard');
        }

        // Configuration des événements globaux
        this.setupGlobalEventListeners();
    }

    setupGlobalEventListeners() {
        // Gestion des erreurs globales
        window.addEventListener('error', (event) => {
            console.error('💥 Erreur globale capturée:', event.error);
            
            if (window.uiManager) {
                window.uiManager.showNotification('Une erreur inattendue s\'est produite', 'error');
            }
        });

        // Gestion des promesses rejetées
        window.addEventListener('unhandledrejection', (event) => {
            console.error('💥 Promise rejetée:', event.reason);
            event.preventDefault(); // Éviter l'affichage dans la console
            
            if (window.uiManager) {
                window.uiManager.showNotification('Erreur de chargement', 'warning');
            }
        });

        // Performance monitoring
        if (this.config.debug) {
            this.setupPerformanceMonitoring();
        }
    }

    setupPerformanceMonitoring() {
        // Observer les métriques de performance
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (entry.entryType === 'navigation') {
                            console.log(`📊 Performance - DOMContentLoaded: ${entry.domContentLoadedEventEnd}ms`);
                            console.log(`📊 Performance - Load complet: ${entry.loadEventEnd}ms`);
                        }
                        if (entry.entryType === 'resource' && entry.name.includes('.js')) {
                            console.log(`📊 Script chargé en: ${entry.responseEnd - entry.requestStart}ms - ${entry.name}`);
                        }
                    });
                });
                
                observer.observe({ entryTypes: ['navigation', 'resource'] });
            } catch (e) {
                console.log('ℹ️ PerformanceObserver non supporté');
            }
        }
    }

    handleCriticalError(error) {
        console.error('💥 Erreur critique de l\'application:', error);
        
        const errorScreen = document.getElementById('error-screen');
        const errorMessage = document.getElementById('error-message');
        const loadingScreen = document.getElementById('loading-screen');
        
        let message = 'Une erreur critique s\'est produite lors du chargement.';
        
        if (error.message.includes('Firebase')) {
            message = 'Impossible de se connecter aux services. Vérifiez votre connexion internet.';
        } else if (error.message.includes('script')) {
            message = 'Erreur de chargement des ressources. Veuillez rafraîchir la page.';
        }
        
        if (errorMessage) {
            errorMessage.textContent = message;
            
            if (this.config.debug) {
                errorMessage.innerHTML += `<br><br><small style="color: #666;">
                    Détails techniques: ${error.message}<br>
                    Stack: ${error.stack}
                </small>`;
            }
        }
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (errorScreen) errorScreen.style.display = 'flex';
    }

    // API publique pour le debug
    getLoadedModules() {
        return Array.from(this.loadedModules);
    }

    getManager(name) {
        return this.managers.get(name);
    }

    reloadModule(moduleName) {
        this.loadedModules.delete(moduleName);
        return this.loadModule(moduleName);
    }

    getLoadingStats() {
        return {
            totalModules: this.dependencies.size,
            loadedModules: this.loadedModules.size,
            loadTime: performance.now() - this.startTime,
            version: this.config.version
        };
    }
}

// Exposer pour debug
if (window.SYNERGIA_CONFIG?.debug) {
    window.SynergiaAppLoader = SynergiaAppLoader;
}

// Export pour utilisation modulaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SynergiaAppLoader;
}
