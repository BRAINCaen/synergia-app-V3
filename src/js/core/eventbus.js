// src/js/core/EventBus.js
// Système d'événements centralisé pour SYNERGIA v3.0

import { Logger } from '../utils/Logger.js';

export class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.logger = new Logger('EventBus');
        this.maxListeners = 50; // Limite pour éviter les fuites mémoire
        this.debugMode = import.meta.env?.DEV || false;
        
        // Statistiques pour le debug
        this.stats = {
            totalEvents: 0,
            totalListeners: 0,
            eventsEmitted: new Map()
        };
        
        this.logger.info('EventBus initialisé');
    }
    
    /**
     * Ajouter un listener pour un événement
     */
    on(event, callback, context = null) {
        if (typeof callback !== 'function') {
            this.logger.error(`Callback invalide pour l'événement: ${event}`);
            return this;
        }
        
        // Initialiser l'événement s'il n'existe pas
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        
        const listeners = this.events.get(event);
        
        // Vérifier la limite de listeners
        if (listeners.length >= this.maxListeners) {
            this.logger.warn(`Limite de listeners atteinte pour: ${event} (${this.maxListeners})`);
        }
        
        // Créer l'objet listener
        const listener = {
            callback,
            context,
            id: this.generateListenerId(),
            timestamp: Date.now()
        };
        
        listeners.push(listener);
        this.stats.totalListeners++;
        
        if (this.debugMode) {
            this.logger.debug(`Listener ajouté pour: ${event} (total: ${listeners.length})`);
        }
        
        // Retourner une fonction de nettoyage
        return () => this.off(event, callback);
    }
    
    /**
     * Ajouter un listener qui ne s'exécute qu'une fois
     */
    once(event, callback, context = null) {
        if (typeof callback !== 'function') {
            this.logger.error(`Callback invalide pour l'événement once: ${event}`);
            return this;
        }
        
        // Initialiser l'événement s'il n'existe pas
        if (!this.onceEvents.has(event)) {
            this.onceEvents.set(event, []);
        }
        
        const listeners = this.onceEvents.get(event);
        
        const listener = {
            callback,
            context,
            id: this.generateListenerId(),
            timestamp: Date.now()
        };
        
        listeners.push(listener);
        
        if (this.debugMode) {
            this.logger.debug(`Listener 'once' ajouté pour: ${event}`);
        }
        
        return () => this.offOnce(event, callback);
    }
    
    /**
     * Retirer un listener spécifique
     */
    off(event, callback = null) {
        // Si pas de callback, retirer tous les listeners de l'événement
        if (!callback) {
            const count = this.events.get(event)?.length || 0;
            this.events.delete(event);
            this.stats.totalListeners -= count;
            
            if (this.debugMode) {
                this.logger.debug(`Tous les listeners supprimés pour: ${event} (${count})`);
            }
            return this;
        }
        
        // Retirer le listener spécifique
        const listeners = this.events.get(event);
        if (!listeners) return this;
        
        const index = listeners.findIndex(listener => listener.callback === callback);
        if (index !== -1) {
            listeners.splice(index, 1);
            this.stats.totalListeners--;
            
            if (listeners.length === 0) {
                this.events.delete(event);
            }
            
            if (this.debugMode) {
                this.logger.debug(`Listener supprimé pour: ${event}`);
            }
        }
        
        return this;
    }
    
    /**
     * Retirer un listener 'once'
     */
    offOnce(event, callback = null) {
        if (!callback) {
            this.onceEvents.delete(event);
            return this;
        }
        
        const listeners = this.onceEvents.get(event);
        if (!listeners) return this;
        
        const index = listeners.findIndex(listener => listener.callback === callback);
        if (index !== -1) {
            listeners.splice(index, 1);
            
            if (listeners.length === 0) {
                this.onceEvents.delete(event);
            }
        }
        
        return this;
    }
    
    /**
     * Émettre un événement
     */
    emit(event, data = null) {
        this.stats.totalEvents++;
        
        // Statistiques par événement
        const eventCount = this.stats.eventsEmitted.get(event) || 0;
        this.stats.eventsEmitted.set(event, eventCount + 1);
        
        if (this.debugMode) {
            this.logger.debug(`📡 Émission: ${event}`, data);
        }
        
        // Exécuter les listeners normaux
        const listeners = this.events.get(event);
        if (listeners && listeners.length > 0) {
            // Copier le tableau pour éviter les modifications pendant l'itération
            const listenersToExecute = [...listeners];
            
            listenersToExecute.forEach(listener => {
                this.executeListener(listener, event, data);
            });
        }
        
        // Exécuter les listeners 'once' et les supprimer
        const onceListeners = this.onceEvents.get(event);
        if (onceListeners && onceListeners.length > 0) {
            const listenersToExecute = [...onceListeners];
            this.onceEvents.delete(event); // Supprimer tous les 'once' listeners
            
            listenersToExecute.forEach(listener => {
                this.executeListener(listener, event, data);
            });
        }
        
        return this;
    }
    
    /**
     * Émettre un événement de manière asynchrone
     */
    async emitAsync(event, data = null) {
        this.stats.totalEvents++;
        
        const eventCount = this.stats.eventsEmitted.get(event) || 0;
        this.stats.eventsEmitted.set(event, eventCount + 1);
        
        if (this.debugMode) {
            this.logger.debug(`📡 Émission async: ${event}`, data);
        }
        
        const promises = [];
        
        // Listeners normaux
        const listeners = this.events.get(event);
        if (listeners && listeners.length > 0) {
            const listenersToExecute = [...listeners];
            
            listenersToExecute.forEach(listener => {
                promises.push(this.executeListenerAsync(listener, event, data));
            });
        }
        
        // Listeners 'once'
        const onceListeners = this.onceEvents.get(event);
        if (onceListeners && onceListeners.length > 0) {
            const listenersToExecute = [...onceListeners];
            this.onceEvents.delete(event);
            
            listenersToExecute.forEach(listener => {
                promises.push(this.executeListenerAsync(listener, event, data));
            });
        }
        
        // Attendre tous les listeners
        const results = await Promise.allSettled(promises);
        
        // Logger les erreurs
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                this.logger.error(`Erreur dans listener async pour ${event}:`, result.reason);
            }
        });
        
        return results;
    }
    
    /**
     * Exécuter un listener de manière synchrone
     */
    executeListener(listener, event, data) {
        try {
            if (listener.context) {
                listener.callback.call(listener.context, data, event);
            } else {
                listener.callback(data, event);
            }
        } catch (error) {
            this.logger.error(`Erreur dans listener pour ${event}:`, error);
            
            // Émettre un événement d'erreur
            this.emit('eventbus:listener-error', {
                event,
                error,
                listener: listener.id
            });
        }
    }
    
    /**
     * Exécuter un listener de manière asynchrone
     */
    async executeListenerAsync(listener, event, data) {
        try {
            let result;
            if (listener.context) {
                result = listener.callback.call(listener.context, data, event);
            } else {
                result = listener.callback(data, event);
            }
            
            // Attendre si c'est une promesse
            if (result && typeof result.then === 'function') {
                await result;
            }
            
            return result;
        } catch (error) {
            this.logger.error(`Erreur dans listener async pour ${event}:`, error);
            
            this.emit('eventbus:listener-error', {
                event,
                error,
                listener: listener.id
            });
            
            throw error;
        }
    }
    
    /**
     * Vérifier si un événement a des listeners
     */
    hasListeners(event) {
        const normalListeners = this.events.get(event)?.length || 0;
        const onceListeners = this.onceEvents.get(event)?.length || 0;
        return normalListeners + onceListeners > 0;
    }
    
    /**
     * Obtenir le nombre de listeners pour un événement
     */
    listenerCount(event) {
        const normalListeners = this.events.get(event)?.length || 0;
        const onceListeners = this.onceEvents.get(event)?.length || 0;
        return normalListeners + onceListeners;
    }
    
    /**
     * Obtenir tous les événements enregistrés
     */
    eventNames() {
        const normalEvents = Array.from(this.events.keys());
        const onceEvents = Array.from(this.onceEvents.keys());
        return [...new Set([...normalEvents, ...onceEvents])];
    }
    
    /**
     * Supprimer tous les listeners
     */
    removeAllListeners(event = null) {
        if (event) {
            this.off(event);
            this.offOnce(event);
        } else {
            const totalRemoved = this.stats.totalListeners;
            this.events.clear();
            this.onceEvents.clear();
            this.stats.totalListeners = 0;
            
            this.logger.info(`Tous les listeners supprimés (${totalRemoved})`);
        }
        
        return this;
    }
    
    /**
     * Créer un namespace pour éviter les collisions
     */
    namespace(name) {
        return {
            on: (event, callback, context) => this.on(`${name}:${event}`, callback, context),
            once: (event, callback, context) => this.once(`${name}:${event}`, callback, context),
            off: (event, callback) => this.off(`${name}:${event}`, callback),
            emit: (event, data) => this.emit(`${name}:${event}`, data),
            emitAsync: (event, data) => this.emitAsync(`${name}:${event}`, data)
        };
    }
    
    /**
     * Middleware pour intercepter/modifier les événements
     */
    addMiddleware(middleware) {
        if (typeof middleware !== 'function') {
            this.logger.error('Middleware invalide');
            return this;
        }
        
        // TODO: Implémenter le système de middleware
        this.logger.warn('Système de middleware à implémenter');
        return this;
    }
    
    /**
     * Générer un ID unique pour les listeners
     */
    generateListenerId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * Obtenir les statistiques
     */
    getStats() {
        return {
            ...this.stats,
            activeEvents: this.eventNames().length,
            totalListeners: this.stats.totalListeners,
            eventsBreakdown: Object.fromEntries(this.stats.eventsEmitted)
        };
    }
    
    /**
     * Debug: afficher tous les listeners
     */
    debug() {
        if (!this.debugMode) {
            this.logger.warn('Mode debug désactivé');
            return;
        }
        
        console.group('%c[EventBus] État actuel', 'color: #6d28d9; font-weight: bold;');
        
        console.log('📊 Statistiques:', this.getStats());
        
        console.group('📡 Événements normaux:');
        this.events.forEach((listeners, event) => {
            console.log(`${event}: ${listeners.length} listener(s)`);
        });
        console.groupEnd();
        
        console.group('⚡ Événements 'once':');
        this.onceEvents.forEach((listeners, event) => {
            console.log(`${event}: ${listeners.length} listener(s)`);
        });
        console.groupEnd();
        
        console.groupEnd();
    }
    
    /**
     * Vérification de la santé de l'EventBus
     */
    healthCheck() {
        const issues = [];
        
        // Vérifier les fuites mémoire potentielles
        if (this.stats.totalListeners > 200) {
            issues.push(`Nombre élevé de listeners: ${this.stats.totalListeners}`);
        }
        
        // Vérifier les événements avec trop de listeners
        this.events.forEach((listeners, event) => {
            if (listeners.length > 20) {
                issues.push(`Trop de listeners pour ${event}: ${listeners.length}`);
            }
        });
        
        // Vérifier les listeners abandonnés (très anciens)
        const now = Date.now();
        const oldThreshold = 30 * 60 * 1000; // 30 minutes
        
        this.events.forEach((listeners, event) => {
            const oldListeners = listeners.filter(l => now - l.timestamp > oldThreshold);
            if (oldListeners.length > 0) {
                issues.push(`Listeners anciens pour ${event}: ${oldListeners.length}`);
            }
        });
        
        if (issues.length > 0) {
            this.logger.warn('Problèmes détectés dans EventBus:', issues);
        } else {
            this.logger.info('EventBus en bonne santé ✅');
        }
        
        return {
            healthy: issues.length === 0,
            issues
        };
    }
    
    /**
     * Nettoyer les listeners anciens
     */
    cleanup() {
        const now = Date.now();
        const cleanupThreshold = 60 * 60 * 1000; // 1 heure
        let cleaned = 0;
        
        this.events.forEach((listeners, event) => {
            const filteredListeners = listeners.filter(l => now - l.timestamp < cleanupThreshold);
            cleaned += listeners.length - filteredListeners.length;
            
            if (filteredListeners.length === 0) {
                this.events.delete(event);
            } else {
                this.events.set(event, filteredListeners);
            }
        });
        
        this.stats.totalListeners -= cleaned;
        
        if (cleaned > 0) {
            this.logger.info(`Nettoyage effectué: ${cleaned} listeners anciens supprimés`);
        }
        
        return cleaned;
    }
}

// Instance globale pour faciliter l'usage
export const eventBus = new EventBus();

// Helper pour créer des EventBus nommés
export function createEventBus(name = 'EventBus') {
    return new EventBus();
}

// Exposer globalement en mode debug
if (import.meta.env?.DEV) {
    window.eventBus = eventBus;
    window.createEventBus = createEventBus;
}