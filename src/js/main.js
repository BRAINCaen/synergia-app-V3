/**
 * Point d'entrée principal pour SYNERGIA v3.0
 * Fichier: src/js/main.js
 */

// État global de l'application
window.SYNERGIA = {
    version: '3.0.4',
    initialized: false,
    modules: {},
    config: null
};

/**
 * Classe principale de l'application
 */
class SynergiaApp {
    constructor() {
        this.modules = new Map();
        this.isInitialized = false;
        this.loadingSteps = [
            'Configuration',
            'Firebase',
            'Authentification', 
            'Équipe',
            'Pointage',
            'Router'
        ];
        this.currentStep = 0;
    }

    /**
     * Initialise l'application
     */
    async initialize() {
        try {
            console.log('🚀 SYNERGIA v3.0 - Démarrage de l\'initialisation');
            
            this.updateLoadingStatus('Chargement de la configuration...');
            await this.loadConfiguration();
            
            this.updateLoadingStatus('Initialisation Firebase...');
            await this.initializeFirebase();
            
            this.updateLoadingStatus('Configuration de l\'authentification...');
            await this.initializeAuth();
            
            this.updateLoadingStatus('Chargement des managers...');
            await this.initializeManagers();
            
            this.updateLoadingStatus('Démarrage du router...');
            await this.initializeRouter();
            
            this.updateLoadingStatus('Finalisation...');
            await this.finalizeInitialization();
            
            this.isInitialized = true;
            console.log('✅ SYNERGIA v3.0 - Initialisation terminée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showError(error);
        }
    }

    /**
     * Charge la configuration
     */
    async loadConfiguration() {
        if (!window.FIREBASE_CONFIG) {
            throw new Error('Configuration Firebase manquante');
        }
        
        window.SYNERGIA.config = {
            firebase: window.FIREBASE_CONFIG,
            app: window.APP_CONFIG || {}
        };
        
        console.log('✅ Configuration chargée');
    }

    /**
     * Initialise Firebase
     */
    async initializeFirebase() {
        if (typeof FirebaseService === 'undefined') {
            throw new Error('FirebaseService non disponible');
        }
        
        if (!window.firebaseService) {
            window.firebaseService = new FirebaseService();
        }
        
        await window.firebaseService.waitForInitialization();
        this.modules.set('firebase', window.firebaseService);
        
        console.log('✅ Firebase Service prêt');
    }

    /**
     * Initialise l'authentification
     */
    async initializeAuth() {
        if (typeof AuthManager === 'undefined') {
            console.warn('⚠️ AuthManager non disponible');
            return;
        }
        
        window.authManager = new AuthManager();
        await window.authManager.init();
        this.modules.set('auth', window.authManager);
        
        console.log('✅ Auth Manager prêt');
    }

    /**
     * Initialise les managers
     */
    async initializeManagers() {
        // Team Manager
        if (typeof TeamManager !== 'undefined') {
            window.teamManager = new TeamManager();
            this.modules.set('team', window.teamManager);
            console.log('✅ Team Manager prêt');
        } else {
            console.warn('⚠️ TeamManager non disponible');
        }
        
        // Badging Manager
        if (typeof BadgingManager !== 'undefined') {
            window.badgingManager = new BadgingManager();
            this.modules.set('badging', window.badgingManager);
            console.log('✅ Badging Manager prêt');
        } else {
            console.warn('⚠️ BadgingManager non disponible');
        }
        
        // Autres managers optionnels
        if (typeof ChatManager !== 'undefined') {
            window.chatManager = new ChatManager();
            this.modules.set('chat', window.chatManager);
            console.log('✅ Chat Manager prêt');
        }
        
        if (typeof PlanningManager !== 'undefined') {
            window.planningManager = new PlanningManager();
            this.modules.set('planning', window.planningManager);
            console.log('✅ Planning Manager prêt');
        }
        
        if (typeof NotificationManager !== 'undefined') {
            window.notificationManager = new NotificationManager();
            this.modules.set('notifications', window.notificationManager);
            console.log('✅ Notification Manager prêt');
        }
        
        if (typeof QuestManager !== 'undefined') {
            window.questManager = new QuestManager();
            this.modules.set('quests', window.questManager);
            console.log('✅ Quest Manager prêt');
        }
    }

    /**
     * Initialise le router
     */
    async initializeRouter() {
        if (typeof Router === 'undefined') {
            throw new Error('Router non disponible');
        }
        
        window.router = new Router();
        this.modules.set('router', window.router);
        
        console.log('✅ Router prêt');
    }

    /**
     * Finalise l'initialisation
     */
    async finalizeInitialization() {
        // Configurer les gestionnaires d'événements globaux
        this.setupGlobalEventHandlers();
        
        // Sauvegarder les modules dans SYNERGIA global
        window.SYNERGIA.modules = Object.fromEntries(this.modules);
        window.SYNERGIA.initialized = true;
        
        // Émettre l'événement d'initialisation terminée
        window.dispatchEvent(new CustomEvent('synergia:ready', {
            detail: { 
                version: window.SYNERGIA.version,
                modules: Array.from(this.modules.keys())
            }
        }));
        
        console.log('🎉 SYNERGIA v3.0 prêt à l\'utilisation');
    }

    /**
     * Configure les gestionnaires d'événements globaux
     */
    setupGlobalEventHandlers() {
        // Gestion des erreurs globales
        window.addEventListener('error', (e) => {
            console.error('❌ Erreur JavaScript globale:', e.error);
            this.handleGlobalError(e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('❌ Promesse rejetée:', e.reason);
            this.handleGlobalError(e.reason);
        });

        // Gestion de la visibilité de la page
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });

        // Gestion avant fermeture
        window.addEventListener('beforeunload', (e) => {
            this.onBeforeUnload(e);
        });

        console.log('✅ Gestionnaires d\'événements globaux configurés');
    }

    /**
     * Met à jour le statut de chargement
     */
    updateLoadingStatus(message) {
        const loadingText = document.querySelector('.loading-container p');
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        console.log(`📋 ${message}`);
        this.currentStep++;
    }

    /**
     * Affiche une erreur
     */
    showError(error) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                <div class="card" style="text-align: center; margin-top: 50px; border-color: var(--danger-color);">
                    <h2 style="color: var(--danger-color);">
                        <i class="fas fa-exclamation-circle"></i>
                        Erreur d'initialisation
                    </h2>
                    <p style="margin: 20px 0;">Une erreur s'est produite lors du démarrage de l'application.</p>
                    <div style="background: var(--glass-bg-strong); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
                        <strong>Détails :</strong><br>
                        <code style="color: var(--danger-color);">${error.message}</code>
                    </div>
                    <div style="margin-top: 30px;">
                        <button onclick="location.reload()" class="btn btn-primary">
                            <i class="fas fa-sync"></i>
                            Recharger l'application
                        </button>
                        <button onclick="app.showDebugInfo()" class="btn btn-secondary" style="margin-left: 10px;">
                            <i class="fas fa-bug"></i>
                            Informations de debug
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Affiche les informations de debug
     */
    showDebugInfo() {
        const debugInfo = {
            version: window.SYNERGIA.version,
            userAgent: navigator.userAgent,
            url: window.location.href,
            modulesLoaded: Array.from(this.modules.keys()),
            modulesAvailable: {
                FirebaseService: typeof FirebaseService !== 'undefined',
                AuthManager: typeof AuthManager !== 'undefined',
                TeamManager: typeof TeamManager !== 'undefined',
                BadgingManager: typeof BadgingManager !== 'undefined',
                Router: typeof Router !== 'undefined'
            },
            firebase: {
                available: typeof firebase !== 'undefined',
                initialized: this.modules.has('firebase')
            },
            errors: this.errors || [],
            timestamp: new Date().toISOString()
        };

        console.log('🐛 SYNERGIA Debug Info:', debugInfo);
        
        // Afficher dans une fenêtre modal
        alert(`Debug Info exportées dans la console.\n\nVersion: ${debugInfo.version}\nModules: ${debugInfo.modulesLoaded.join(', ')}`);
    }

    /**
     * Gestion des erreurs globales
     */
    handleGlobalError(error) {
        if (!this.errors) this.errors = [];
        
        this.errors.push({
            error: error.toString(),
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Garder seulement les 10 dernières erreurs
        if (this.errors.length > 10) {
            this.errors = this.errors.slice(-10);
        }
    }

    /**
     * Quand la page devient cachée
     */
    onPageHidden() {
        // Arrêter les timers si nécessaire
        if (window.badgingManager && typeof window.badgingManager.stopClock === 'function') {
            window.badgingManager.stopClock();
        }
        
        console.log('👁️ Page cachée - timers arrêtés');
    }

    /**
     * Quand la page redevient visible
     */
    onPageVisible() {
        // Redémarrer les timers si nécessaire
        if (window.badgingManager && typeof window.badgingManager.startClock === 'function') {
            window.badgingManager.startClock();
        }
        
        console.log('👁️ Page visible - timers redémarrés');
    }

    /**
     * Avant fermeture de la page
     */
    onBeforeUnload(e) {
        // Nettoyer les resources si nécessaire
        this.modules.forEach(module => {
            if (typeof module.cleanup === 'function') {
                module.cleanup();
            }
        });
    }

    /**
     * API publique pour vérifier l'état
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            modules: Array.from(this.modules.keys()),
            version: window.SYNERGIA.version
        };
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new SynergiaApp();
    await window.app.initialize();
});

// Export pour les tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SynergiaApp;
}
import { timeClockModule } from './src/js/modules/timeclock-init.js';
await timeClockModule.initialize();
