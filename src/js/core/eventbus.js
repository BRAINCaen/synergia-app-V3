/**
 * EventBus - Système de communication entre modules
 * Fichier: src/js/core/eventbus.js
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Set();
        this.debug = false;
    }

    /**
     * Écouter un événement
     * @param {string} eventName - Nom de l'événement
     * @param {function} callback - Fonction de callback
     */
    on(eventName, callback) {
        if (typeof callback !== 'function') {
            console.error('EventBus: Le callback doit être une fonction');
            return;
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        this.events.get(eventName).push(callback);

        if (this.debug) {
            console.log(`EventBus: Listener ajouté pour "${eventName}"`);
        }
    }

    /**
     * Écouter un événement une seule fois
     * @param {string} eventName - Nom de l'événement
     * @param {function} callback - Fonction de callback
     */
    once(eventName, callback) {
        if (typeof callback !== 'function') {
            console.error('EventBus: Le callback doit être une fonction');
            return;
        }

        const onceCallback = (...args) => {
            callback(...args);
            this.off(eventName, onceCallback);
        };

        this.onceEvents.add(onceCallback);
        this.on(eventName, onceCallback);

        if (this.debug) {
            console.log(`EventBus: Listener "once" ajouté pour "${eventName}"`);
        }
    }

    /**
     * Supprimer un listener
     * @param {string} eventName - Nom de l'événement
     * @param {function} callback - Fonction de callback à supprimer
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) {
            return;
        }

        const listeners = this.events.get(eventName);
        const index = listeners.indexOf(callback);

        if (index > -1) {
            listeners.splice(index, 1);
            
            if (listeners.length === 0) {
                this.events.delete(eventName);
            }

            if (this.debug) {
                console.log(`EventBus: Listener supprimé pour "${eventName}"`);
            }
        }
    }

    /**
     * Émettre un événement
     * @param {string} eventName - Nom de l'événement
     * @param {...any} args - Arguments à passer aux callbacks
     */
    emit(eventName, ...args) {
        if (this.debug) {
            console.log(`EventBus: Émission "${eventName}"`, args);
        }

        if (!this.events.has(eventName)) {
            if (this.debug) {
                console.log(`EventBus: Aucun listener pour "${eventName}"`);
            }
            return;
        }

        const listeners = this.events.get(eventName);
        
        // Copier le tableau pour éviter les problèmes si des listeners sont supprimés pendant l'exécution
        const listenersToCall = [...listeners];

        listenersToCall.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`EventBus: Erreur dans le callback pour "${eventName}":`, error);
            }
        });
    }

    /**
     * Supprimer tous les listeners d'un événement
     * @param {string} eventName - Nom de l'événement
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
            if (this.debug) {
                console.log(`EventBus: Tous les listeners supprimés pour "${eventName}"`);
            }
        } else {
            this.events.clear();
            this.onceEvents.clear();
            if (this.debug) {
                console.log('EventBus: Tous les listeners supprimés');
            }
        }
    }

    /**
     * Obtenir la liste des événements écoutés
     * @returns {string[]} - Tableau des noms d'événements
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Obtenir le nombre de listeners pour un événement
     * @param {string} eventName - Nom de l'événement
     * @returns {number} - Nombre de listeners
     */
    getListenerCount(eventName) {
        if (!this.events.has(eventName)) {
            return 0;
        }
        return this.events.get(eventName).length;
    }

    /**
     * Activer/désactiver le mode debug
     * @param {boolean} enabled - Activer ou non le debug
     */
    setDebug(enabled) {
        this.debug = !!enabled;
        console.log(`EventBus: Mode debug ${this.debug ? 'activé' : 'désactivé'}`);
    }

    /**
     * Obtenir des statistiques sur l'EventBus
     * @returns {object} - Statistiques
     */
    getStats() {
        const totalEvents = this.events.size;
        const totalListeners = Array.from(this.events.values())
            .reduce((total, listeners) => total + listeners.length, 0);

        return {
            totalEvents,
            totalListeners,
            events: Object.fromEntries(
                Array.from(this.events.entries()).map(([name, listeners]) => [
                    name,
                    listeners.length
                ])
            )
        };
    }

    /**
     * Nettoyer complètement l'EventBus
     */
    destroy() {
        this.removeAllListeners();
        console.log('EventBus: Instance détruite');
    }
}

// Créer une instance globale
const eventBusInstance = new EventBus();

// Export pour utilisation en module
export { EventBus, eventBusInstance };
export default eventBusInstance;

// Export global pour compatibilité
window.EventBus = eventBusInstance;
