/**
 * Main.js - Point d'entrée SYNERGIA v3.0
 */

// Imports des modules existants
import { FirebaseService } from './core/firebase-service.js';
import { AuthManager } from './managers/AuthManager.js';
import { BadgingManager } from './managers/badging-manager.js';
import { TeamManager } from './managers/team-manager.js';
import { Router } from './core/router.js';

// Import du nouveau module de pointage
import { timeClockModule } from './modules/timeclock-init.js';

class SynergiaApp {
    constructor() {
        this.isInitialized = false;
        this.managers = {};
        console.log('🚀 Initialisation SYNERGIA v3.0...');
    }

    async init() {
        try {
            // 1. Initialiser Firebase
            await this.initFirebase();
            
            // 2. Initialiser les managers
            await this.initManagers();
            
            // 3. Initialiser le router (qui va initialiser le module de pointage)
            await this.initRouter();
            
            // 4. Configuration finale
            this.setupGlobalHandlers();
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ SYNERGIA v3.0 initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur d\'initialisation:', error);
            this.showErrorScreen(error);
        }
    }

    async initFirebase() {
        try {
            await FirebaseService.initialize();
            console.log('✅ Firebase initialisé');
        } catch (error) {
            console.error('❌ Erreur Firebase:', error);
            throw error;
        }
    }

    async initManagers() {
        try {
            // Auth Manager
            this.managers.auth = new AuthManager();
            await this.managers.auth.initialize();
            window.authManager = this.managers.auth;
            
            // Badging Manager
            this.managers.badging = new BadgingManager();
            await this.managers.badging.initialize();
            window.badgingManager = this.managers.badging;
            
            // Team Manager
            this.managers.team = new TeamManager();
            await this.managers.team.initialize();
            window.teamManager = this.managers.team;
            
            console.log('✅ Managers initialisés');
        } catch (error) {
            console.error('❌ Erreur managers:', error);
            throw error;
        }
    }

    async initRouter() {
        try {
            // Le router va automatiquement initialiser le module de pointage
            this.router = new Router();
            window.router = this.router;
            
            console.log('✅ Router initialisé');
        } catch (error) {
            console.error('❌ Erreur router:', error);
            throw error;
        }
    }

    setupGlobalHandlers() {
        // Gestionnaire d'erreurs globales
        window.addEventListener('error', (event) => {
            console.error('Erreur globale:', event.error);
        });

        // Gestionnaire pour les promesses rejetées
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promesse rejetée:', event.reason);
        });

        // Gestionnaire de connexion/déconnexion
        window.addEventListener('auth:stateChanged', (event) => {
            const { isAuthenticated, user } = event.detail;
            if (isAuthenticated) {
                console.log('👤 Utilisateur connecté:', user.email);
            } else {
                console.log('👤 Utilisateur déconnecté');
            }
        });

        // Handlers pour l'ancien système de badging (compatibilité)
        window.handleCheckIn = () => {
            if (this.managers.badging) {
                this.managers.badging.checkIn();
            }
        };

        window.handleCheckOut = () => {
            if (this.managers.badging) {
                this.managers.badging.checkOut();
            }
        };

        window.handleBreakStart = () => {
            if (this.managers.badging) {
                this.managers.badging.startBreak();
            }
        };

        window.handleBreakEnd = () => {
            if (this.managers.badging) {
                this.managers.badging.endBreak();
            }
        };

        // Handlers Auth
        window.handleGoogleLogin = () => {
            if (this.managers.auth) {
                this.managers.auth.signInWithGoogle();
            }
        };

        window.handleSignOut = () => {
            if (this.managers.auth) {
                this.managers.auth.signOut();
            }
        };

        // Handler pour équipe
        window.openAddMemberModal = () => {
            console.log('Ouverture modal ajout membre');
        };

        window.editMember = (memberId) => {
            console.log('Édition membre:', memberId);
        };

        window.deleteMemberConfirm = (memberId) => {
            console.log('Suppression membre:', memberId);
        };
    }

    hideLoadingScreen() {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.remove();
            }, 300);
        }
    }

    showErrorScreen(error) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="error-screen">
                <div class="error-container">
                    <h1>❌ Erreur d'initialisation</h1>
                    <p>Une erreur s'est produite lors du chargement de l'application.</p>
                    <details>
                        <summary>Détails techniques</summary>
                        <pre>${error.stack || error.message}</pre>
                    </details>
                    <button onclick="location.reload()" class="btn btn-primary">
                        🔄 Recharger l'application
                    </button>
                </div>
            </div>
        `;
    }

    // Méthodes utilitaires
    getManager(name) {
        return this.managers[name];
    }

    getRouter() {
        return this.router;
    }

    isReady() {
        return this.isInitialized;
    }

    async destroy() {
        // Nettoyer tous les managers
        for (const [name, manager] of Object.entries(this.managers)) {
            if (manager && typeof manager.destroy === 'function') {
                try {
                    await manager.destroy();
                    console.log(`✅ Manager ${name} nettoyé`);
                } catch (error) {
                    console.error(`❌ Erreur nettoyage manager ${name}:`, error);
                }
            }
        }

        // Nettoyer le router
        if (this.router && typeof this.router.destroy === 'function') {
            this.router.destroy();
        }

        // Nettoyer le module de pointage
        if (timeClockModule && typeof timeClockModule.destroy === 'function') {
            timeClockModule.destroy();
        }

        this.isInitialized = false;
        console.log('🧹 Application nettoyée');
    }
}

// CSS pour les écrans de loading et d'erreur
const appStyles = `
.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    z-index: 9999;
    transition: opacity 0.3s ease;
}

.loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255,255,255,0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

.loading-screen p {
    font-size: 1.2rem;
    margin: 0;
}

.error-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #f8f9fa;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.error-container {
    max-width: 600px;
    text-align: center;
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.error-container h1 {
    color: #dc3545;
    margin-bottom: 20px;
}

.error-container details {
    margin: 20px 0;
    text-align: left;
}

.error-container pre {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 6px;
    font-size: 0.9rem;
    overflow-x: auto;
}

.btn {
    display: inline-block;
    padding: 12px 24px;
    background: #007bff;
    color: white;
    text-decoration: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.3s ease;
}

.btn:hover {
    background: #0056b3;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// Injecter les styles
const styleEl = document.createElement('style');
styleEl.textContent = appStyles;
document.head.appendChild(styleEl);

// Initialiser l'application
const app = new SynergiaApp();

// Démarrer l'app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Service Worker pour PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ Service Worker enregistré:', registration);
        } catch (error) {
            console.log('ℹ️ Service Worker non disponible:', error);
        }
    });
}

// Export global
window.synergiaApp = app;
export default app;
