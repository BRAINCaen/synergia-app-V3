// src/js/modules/timeclock-init.js
import { TimeClockController } from '../controllers/timeclock-controller.js';
import { EventBus } from '../core/eventbus.js';
import { Logger } from '../core/logger.js';

export class TimeClockModule {
    constructor() {
        this.controller = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Vérifier que l'utilisateur est connecté
            EventBus.on('auth:userChanged', (user) => {
                if (user) {
                    this.initController();
                } else {
                    this.cleanup();
                }
            });

            // Initialiser si l'utilisateur est déjà connecté
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                this.initController();
            }

            this.setupRouting();
            this.isInitialized = true;
            
            Logger.info('TimeClockModule initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize TimeClockModule:', error);
            throw error;
        }
    }

    initController() {
        if (!this.controller) {
            this.controller = new TimeClockController();
        }
    }

    setupRouting() {
        // Ajouter la route dans votre router
        EventBus.on('router:beforeNavigate', (route) => {
            if (route === 'timeclock' || route === 'pointage') {
                this.loadTimeClockPage();
            }
        });

        // Gérer les notifications de rappel
        EventBus.on('planning:clockoutReminder', () => {
            this.showClockoutReminder();
        });

        // Gérer les alertes de retard
        EventBus.on('timeclock:lateArrival', (data) => {
            this.showLateArrivalAlert(data);
        });
    }

    async loadTimeClockPage() {
        try {
            // Charger le CSS si pas déjà fait
            if (!document.querySelector('link[href*="timeclock.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = './src/styles/modules/timeclock.css';
                document.head.appendChild(link);
            }

            // Charger le HTML de la page
            const response = await fetch('./src/templates/timeclock.html');
            const html = await response.text();
            
            // Injecter dans le container principal
            const mainContainer = document.getElementById('main-content') || document.body;
            mainContainer.innerHTML = html;

            // Initialiser le contrôleur si pas déjà fait
            this.initController();

            EventBus.emit('page:loaded', 'timeclock');
        } catch (error) {
            Logger.error('Failed to load timeclock page:', error);
            this.showError('Impossible de charger la page de pointage');
        }
    }

    showClockoutReminder() {
        EventBus.emit('notification:show', {
            title: 'Rappel de dépointage',
            message: 'N\'oubliez pas de dépointer à la fin de votre journée de travail',
            type: 'warning',
            duration: 10000,
            actions: [
                {
                    label: 'Dépointer maintenant',
                    action: () => this.navigateToTimeclock()
                },
                {
                    label: 'Rappeler plus tard',
                    action: () => this.scheduleReminder(30) // 30 minutes
                }
            ]
        });
    }

    showLateArrivalAlert(data) {
        const lateMinutes = data.lateMinutes;
        const message = `Vous avez ${lateMinutes} minute${lateMinutes > 1 ? 's' : ''} de retard`;
        
        EventBus.emit('notification:show', {
            title: 'Retard détecté',
            message: message,
            type: 'warning',
            duration: 8000
        });

        // Log pour les RH/admin
        Logger.warn('Late arrival detected:', {
            userId: this.getCurrentUser()?.uid,
            lateMinutes: lateMinutes,
            expectedTime: data.expectedTime,
            actualTime: data.actualTime
        });
    }

    navigateToTimeclock() {
        EventBus.emit('router:navigate', 'timeclock');
    }

    scheduleReminder(delayMinutes) {
        setTimeout(() => {
            this.showClockoutReminder();
        }, delayMinutes * 60 * 1000);
    }

    // Intégration avec le planning
    async syncWithPlanning() {
        try {
            // Récupérer les données de planning pour alertes
            EventBus.emit('planning:requestSync');
            
            // Programmer les rappels automatiques
            this.scheduleDailyReminders();
        } catch (error) {
            Logger.error('Failed to sync with planning:', error);
        }
    }

    scheduleDailyReminders() {
        // Programmer un rappel quotidien de dépointage à 18h
        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(18, 0, 0, 0);
        
        if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }
        
        const timeUntilReminder = reminderTime.getTime() - now.getTime();
        
        setTimeout(() => {
            this.checkForActiveSession();
            this.scheduleDailyReminders(); // Re-programmer pour le lendemain
        }, timeUntilReminder);
    }

    async checkForActiveSession() {
        if (this.controller && this.controller.timeClockManager) {
            const currentSession = this.controller.timeClockManager.getCurrentSession();
            if (currentSession && !currentSession.clockOut) {
                this.showClockoutReminder();
            }
        }
    }

    // Raccourcis clavier globaux
    setupGlobalShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+P pour accès rapide au pointage
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.navigateToTimeclock();
            }
        });
    }

    // Intégration PWA - Badge notification
    updateAppBadge(count = 0) {
        if ('navigator' in window && 'setAppBadge' in navigator) {
            if (count > 0) {
                navigator.setAppBadge(count);
            } else {
                navigator.clearAppBadge();
            }
        }
    }

    // Gestion des erreurs
    showError(message) {
        EventBus.emit('notification:show', {
            title: 'Erreur',
            message: message,
            type: 'error',
            duration: 5000
        });
    }

    // Utility methods
    getCurrentUser() {
        // À adapter selon votre AuthManager
        return EventBus.emit('auth:getCurrentUser');
    }

    cleanup() {
        if (this.controller) {
            this.controller.destroy();
            this.controller = null;
        }
    }

    destroy() {
        this.cleanup();
        EventBus.off('auth:userChanged');
        EventBus.off('router:beforeNavigate');
        EventBus.off('planning:clockoutReminder');
        EventBus.off('timeclock:lateArrival');
        this.isInitialized = false;
    }
}

// Export singleton
export const timeClockModule = new TimeClockModule();
