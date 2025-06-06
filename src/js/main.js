// Exemple d'intégration dans votre src/js/main.js

// Imports existants
import { EventBus } from './core/eventbus.js';
import { FirebaseService } from './core/firebase-service.js';
import { AuthManager } from './managers/AuthManager.js';
import { Logger } from './core/logger.js';

// Import du nouveau module
import { timeClockModule } from './modules/timeclock-init.js';

class App {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
    }

    async initialize() {
        try {
            Logger.info('Initializing Synergia App...');

            // 1. Initialiser les services de base
            await this.initializeCore();

            // 2. Initialiser les modules
            await this.initializeModules();

            // 3. Configurer le routing
            await this.setupRouting();

            // 4. Finaliser l'initialisation
            this.finalizeBoot();

            this.isInitialized = true;
            Logger.info('App initialized successfully');

        } catch (error) {
            Logger.error('Failed to initialize app:', error);
            this.showCriticalError(error);
        }
    }

    async initializeCore() {
        // Firebase
        await FirebaseService.initialize();
        
        // Auth
        const authManager = new AuthManager();
        await authManager.initialize();
        this.modules.set('auth', authManager);

        // Event listeners pour l'auth
        EventBus.on('auth:userChanged', (user) => {
            if (user) {
                this.onUserLoggedIn(user);
            } else {
                this.onUserLoggedOut();
            }
        });
    }

    async initializeModules() {
        try {
            // Initialiser le module de pointage
            await timeClockModule.initialize();
            this.modules.set('timeclock', timeClockModule);
            Logger.info('TimeClock module loaded');

            // Vos autres modules existants...
            // await chatModule.initialize();
            // await planningModule.initialize();
            // await badgingModule.initialize();

        } catch (error) {
            Logger.error('Error initializing modules:', error);
            // Continuer même si un module échoue
        }
    }

    async setupRouting() {
        // Configuration des routes
        const routes = {
            // Routes existantes
            'dashboard': () => this.loadDashboard(),
            'chat': () => this.loadChat(),
            'planning': () => this.loadPlanning(),
            'badges': () => this.loadBadges(),
            
            // Nouvelle route pour le pointage
            'pointage': () => this.loadTimeClock(),
            'timeclock': () => this.loadTimeClock(), // Alias
        };

        // Initialiser le router avec les nouvelles routes
        this.router = new Router(routes);
        
        // Event listeners pour le routing
        EventBus.on('router:navigate', (route) => {
            this.router.navigate(route);
        });

        // Navigation depuis les modules
        EventBus.on('timeclock:navigate', () => {
            this.router.navigate('pointage');
        });
    }

    async loadTimeClock() {
        try {
            // Déléguer au module de pointage
            EventBus.emit('router:beforeNavigate', 'timeclock');
        } catch (error) {
            Logger.error('Error loading timeclock:', error);
            this.showError('Impossible de charger le module de pointage');
        }
    }

    // Méthodes pour vos autres modules existants
    async loadDashboard() {
        // Votre code existant pour le dashboard
    }

    async loadChat() {
        // Votre code existant pour le chat
    }

    async loadPlanning() {
        // Votre code existant pour le planning
    }

    async loadBadges() {
        // Votre code existant pour les badges
    }

    onUserLoggedIn(user) {
        Logger.info('User logged in:', user.uid);
        
        // Initialiser les modules qui dépendent de l'auth
        this.modules.forEach((module, name) => {
            if (module.onUserLoggedIn && typeof module.onUserLoggedIn === 'function') {
                module.onUserLoggedIn(user);
            }
        });

        // Rediriger vers le dashboard ou la dernière page visitée
        const lastRoute = localStorage.getItem('lastRoute') || 'dashboard';
        this.router.navigate(lastRoute);
    }

    onUserLoggedOut() {
        Logger.info('User logged out');
        
        // Nettoyer les modules
        this.modules.forEach((module, name) => {
            if (module.onUserLoggedOut && typeof module.onUserLoggedOut === 'function') {
                module.onUserLoggedOut();
            }
        });

        // Rediriger vers la page de connexion
        this.router.navigate('login');
    }

    finalizeBoot() {
        // Enregistrer les service workers pour PWA
        this.registerServiceWorker();

        // Configurer les notifications
        this.setupNotifications();

        // Raccourcis clavier globaux
        this.setupGlobalShortcuts();

        // Gestion des erreurs globales
        this.setupErrorHandling();

        // Analytics
        this.trackAppStart();
    }

    setupGlobalShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Raccourcis globaux de navigation
            if (e.ctrlKey && e.shiftKey) {
                switch (e.key) {
                    case 'D':
                        e.preventDefault();
                        this.router.navigate('dashboard');
                        break;
                    case 'P':
                        e.preventDefault();
                        this.router.navigate('pointage');
                        break;
                    case 'C':
                        e.preventDefault();
                        this.router.navigate('chat');
                        break;
                    case 'L':
                        e.preventDefault();
                        this.router.navigate('planning');
                        break;
                }
            }
        });
    }

    setupNotifications() {
        // Configuration du système de notifications
        EventBus.on('notification:show', (notification) => {
            this.showNotification(notification);
        });

        // Demander la permission pour les notifications natives
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                Logger.info('Notification permission:', permission);
            });
        }
    }

    showNotification(notification) {
        // Créer et afficher une notification dans l'interface
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification notification-${notification.type || 'info'}`;
        notificationEl.innerHTML = `
            <div class="notification-content">
                ${notification.icon ? `<span class="notification-icon">${notification.icon}</span>` : ''}
                <div class="notification-text">
                    ${notification.title ? `<strong>${notification.title}</strong>` : ''}
                    <p>${notification.message}</p>
                </div>
                <button class="notification-close">×</button>
            </div>
            ${notification.actions ? `
                <div class="notification-actions">
                    ${notification.actions.map(action => 
                        `<button class="notification-action ${action.primary ? 'primary' : ''}" 
                                 data-action="${action.action}">${action.label}</button>`
                    ).join('')}
                </div>
            ` : ''}
        `;

        // Ajouter au container de notifications
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }

        notificationContainer.appendChild(notificationEl);

        // Gestionnaires d'événements
        const closeBtn = notificationEl.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notificationEl);
        });

        // Actions personnalisées
        if (notification.actions) {
            notification.actions.forEach((action, index) => {
                const actionBtn = notificationEl.querySelectorAll('.notification-action')[index];
                actionBtn.addEventListener('click', () => {
                    if (typeof action.action === 'function') {
                        action.action();
                    }
                    this.removeNotification(notificationEl);
                });
            });
        }

        // Auto-suppression
        if (!notification.persistent && notification.duration !== 0) {
            const duration = notification.duration || 5000;
            setTimeout(() => {
                if (notificationEl.parentNode) {
                    this.removeNotification(notificationEl);
                }
            }, duration);
        }

        // Animation d'entrée
        notificationEl.style.transform = 'translateX(100%)';
        requestAnimationFrame(() => {
            notificationEl.style.transition = 'transform 0.3s ease';
            notificationEl.style.transform = 'translateX(0)';
        });
    }

    removeNotification(notificationEl) {
        notificationEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notificationEl.parentNode) {
                notificationEl.parentNode.removeChild(notificationEl);
            }
        }, 300);
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                Logger.info('Service Worker registered:', registration);
            } catch (error) {
                Logger.error('Service Worker registration failed:', error);
            }
        }
    }

    setupErrorHandling() {
        // Gestionnaire d'erreurs JavaScript globales
        window.addEventListener('error', (event) => {
            Logger.error('Global error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // Promesses rejetées non gérées
        window.addEventListener('unhandledrejection', (event) => {
            Logger.error('Unhandled promise rejection:', event.reason);
        });
    }

    trackAppStart() {
        // Analytics de démarrage d'app
        EventBus.emit('analytics:track', {
            category: 'app',
            action: 'start',
            data: {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                modules: Array.from(this.modules.keys())
            }
        });
    }

    showError(message) {
        EventBus.emit('notification:show', {
            title: 'Erreur',
            message: message,
            type: 'error',
            duration: 5000
        });
    }

    showCriticalError(error) {
        // Affichage d'erreur critique quand l'app ne peut pas démarrer
        document.body.innerHTML = `
            <div class="critical-error">
                <h1>Erreur critique</h1>
                <p>L'application n'a pas pu démarrer correctement.</p>
                <details>
                    <summary>Détails techniques</summary>
                    <pre>${error.stack || error.message}</pre>
                </details>
                <button onclick="location.reload()">Recharger</button>
            </div>
        `;
    }

    // Méthodes de gestion du cycle de vie
    async destroy() {
        // Nettoyer tous les modules
        for (const [name, module] of this.modules) {
            if (module.destroy && typeof module.destroy === 'function') {
                try {
                    await module.destroy();
                    Logger.info(`Module ${name} destroyed`);
                } catch (error) {
                    Logger.error(`Error destroying module ${name}:`, error);
                }
            }
        }

        // Nettoyer les event listeners
        EventBus.removeAllListeners();
        
        this.isInitialized = false;
        Logger.info('App destroyed');
    }

    // Getters
    getModule(name) {
        return this.modules.get(name);
    }

    getRouter() {
        return this.router;
    }

    isReady() {
        return this.isInitialized;
    }
}

// CSS pour les notifications (à ajouter dans votre CSS principal)
const notificationStyles = `
.notification-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.notification {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    overflow: hidden;
    border-left: 4px solid;
}

.notification-info { border-left-color: #007bff; }
.notification-success { border-left-color: #28a745; }
.notification-warning { border-left-color: #ffc107; }
.notification-error { border-left-color: #dc3545; }

.notification-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
}

.notification-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
}

.notification-text {
    flex: 1;
}

.notification-text strong {
    display: block;
    margin-bottom: 0.25rem;
    color: #333;
}

.notification-text p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
}

.notification-close {
    background: none;
    border: none;
    font-size: 1.2rem;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.notification-close:hover {
    color: #333;
}

.notification-actions {
    padding: 0 1rem 1rem;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}

.notification-action {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
}

.notification-action.primary {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.notification-action:hover {
    opacity: 0.8;
}

.critical-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.critical-error h1 {
    color: #dc3545;
    margin-bottom: 1rem;
}

.critical-error button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

@media (max-width: 480px) {
    .notification-container {
        left: 1rem;
        right: 1rem;
        max-width: none;
    }
}
`;

// Injecter les styles
const styleEl = document.createElement('style');
styleEl.textContent = notificationStyles;
document.head.appendChild(styleEl);

// Initialiser l'application
const app = new App();

// Démarrer l'app quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Exporter pour utilisation globale
window.app = app;
export default app;
