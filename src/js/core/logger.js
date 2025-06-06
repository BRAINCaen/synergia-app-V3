/**
 * Logger - Système de logs pour SYNERGIA v3.0
 * Fichier: src/js/core/logger.js
 */

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.logLevel = 'info'; // debug, info, warn, error
        this.enableConsole = true;
        this.enableStorage = true;
        this.sessionId = this.generateSessionId();
        
        this.logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        // Charger les logs précédents
        this.loadStoredLogs();
    }

    /**
     * Générer un ID de session unique
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Définir le niveau de log
     * @param {string} level - debug, info, warn, error
     */
    setLogLevel(level) {
        if (this.logLevels.hasOwnProperty(level)) {
            this.logLevel = level;
            this.info(`Niveau de log défini sur: ${level}`);
        } else {
            this.warn(`Niveau de log invalide: ${level}`);
        }
    }

    /**
     * Activer/désactiver la console
     * @param {boolean} enabled
     */
    setConsoleEnabled(enabled) {
        this.enableConsole = !!enabled;
    }

    /**
     * Activer/désactiver le stockage
     * @param {boolean} enabled
     */
    setStorageEnabled(enabled) {
        this.enableStorage = !!enabled;
    }

    /**
     * Vérifier si le niveau de log doit être affiché
     * @param {string} level
     * @returns {boolean}
     */
    shouldLog(level) {
        return this.logLevels[level] >= this.logLevels[this.logLevel];
    }

    /**
     * Créer un objet log
     * @param {string} level
     * @param {string} message
     * @param {any} data
     * @returns {object}
     */
    createLogEntry(level, message, data) {
        return {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            level: level,
            message: message,
            data: data,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
    }

    /**
     * Ajouter un log
     * @param {string} level
     * @param {string} message
     * @param {any} data
     */
    addLog(level, message, data = null) {
        if (!this.shouldLog(level)) {
            return;
        }

        const logEntry = this.createLogEntry(level, message, data);

        // Ajouter à la liste des logs
        this.logs.push(logEntry);

        // Limiter le nombre de logs en mémoire
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Afficher dans la console
        if (this.enableConsole) {
            this.logToConsole(level, message, data, logEntry.timestamp);
        }

        // Stocker dans localStorage
        if (this.enableStorage) {
            this.saveToStorage(logEntry);
        }

        // Émettre un événement
        this.emitLogEvent(logEntry);
    }

    /**
     * Afficher dans la console
     * @param {string} level
     * @param {string} message
     * @param {any} data
     * @param {string} timestamp
     */
    logToConsole(level, message, data, timestamp) {
        const time = new Date(timestamp).toLocaleTimeString('fr-FR');
        const prefix = `[${time}] [${level.toUpperCase()}]`;

        switch (level) {
            case 'debug':
                console.debug(prefix, message, data);
                break;
            case 'info':
                console.info(prefix, message, data);
                break;
            case 'warn':
                console.warn(prefix, message, data);
                break;
            case 'error':
                console.error(prefix, message, data);
                break;
            default:
                console.log(prefix, message, data);
        }
    }

    /**
     * Sauvegarder dans le localStorage
     * @param {object} logEntry
     */
    saveToStorage(logEntry) {
        try {
            const storageKey = `synergia_logs_${new Date().toISOString().split('T')[0]}`;
            const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
            
            existingLogs.push(logEntry);
            
            // Limiter à 100 logs par jour pour éviter de surcharger localStorage
            if (existingLogs.length > 100) {
                existingLogs.shift();
            }
            
            localStorage.setItem(storageKey, JSON.stringify(existingLogs));
        } catch (error) {
            // Si localStorage est plein, nettoyer les anciens logs
            this.cleanOldLogs();
        }
    }

    /**
     * Charger les logs stockés
     */
    loadStoredLogs() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const storageKey = `synergia_logs_${today}`;
            const storedLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
            
            // Fusionner avec les logs actuels (éviter les doublons)
            storedLogs.forEach(log => {
                if (!this.logs.find(l => l.timestamp === log.timestamp)) {
                    this.logs.push(log);
                }
            });
            
            // Trier par timestamp
            this.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
        } catch (error) {
            console.warn('Impossible de charger les logs stockés:', error);
        }
    }

    /**
     * Nettoyer les anciens logs
     */
    cleanOldLogs() {
        try {
            const keysToRemove = [];
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7); // Garder 7 jours
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('synergia_logs_')) {
                    const dateStr = key.replace('synergia_logs_', '');
                    const logDate = new Date(dateStr);
                    
                    if (logDate < cutoffDate) {
                        keysToRemove.push(key);
                    }
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
        } catch (error) {
            console.warn('Erreur lors du nettoyage des logs:', error);
        }
    }

    /**
     * Émettre un événement de log
     * @param {object} logEntry
     */
    emitLogEvent(logEntry) {
        try {
            const event = new CustomEvent('logger:newLog', {
                detail: logEntry
            });
            window.dispatchEvent(event);
        } catch (error) {
            // Ignorer les erreurs d'événements
        }
    }

    // ==================
    // MÉTHODES PUBLIQUES
    // ==================

    /**
     * Log de niveau debug
     * @param {string} message
     * @param {any} data
     */
    debug(message, data = null) {
        this.addLog('debug', message, data);
    }

    /**
     * Log de niveau info
     * @param {string} message
     * @param {any} data
     */
    info(message, data = null) {
        this.addLog('info', message, data);
    }

    /**
     * Log de niveau warning
     * @param {string} message
     * @param {any} data
     */
    warn(message, data = null) {
        this.addLog('warn', message, data);
    }

    /**
     * Log de niveau error
     * @param {string} message
     * @param {any} data
     */
    error(message, data = null) {
        this.addLog('error', message, data);
    }

    /**
     * Obtenir tous les logs
     * @param {string} level - Filtrer par niveau (optionnel)
     * @returns {array}
     */
    getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return [...this.logs];
    }

    /**
     * Obtenir les logs récents
     * @param {number} count - Nombre de logs à retourner
     * @returns {array}
     */
    getRecentLogs(count = 50) {
        return this.logs.slice(-count);
    }

    /**
     * Rechercher dans les logs
     * @param {string} query - Terme de recherche
     * @returns {array}
     */
    searchLogs(query) {
        const searchTerm = query.toLowerCase();
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(searchTerm) ||
            (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
        );
    }

    /**
     * Exporter les logs
     * @param {string} format - 'json' ou 'csv'
     * @returns {string}
     */
    exportLogs(format = 'json') {
        if (format === 'csv') {
            return this.exportToCSV();
        }
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Exporter en CSV
     * @returns {string}
     */
    exportToCSV() {
        const headers = ['Timestamp', 'Level', 'Message', 'Data', 'URL'];
        const rows = this.logs.map(log => [
            log.timestamp,
            log.level,
            log.message.replace(/"/g, '""'), // Échapper les guillemets
            log.data ? JSON.stringify(log.data).replace(/"/g, '""') : '',
            log.url || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    /**
     * Effacer tous les logs
     */
    clearLogs() {
        this.logs = [];
        
        if (this.enableStorage) {
            try {
                const today = new Date().toISOString().split('T')[0];
                const storageKey = `synergia_logs_${today}`;
                localStorage.removeItem(storageKey);
            } catch (error) {
                console.warn('Erreur lors de la suppression des logs stockés:', error);
            }
        }
        
        this.info('Logs effacés');
    }

    /**
     * Obtenir des statistiques sur les logs
     * @returns {object}
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {},
            sessionId: this.sessionId,
            oldestLog: null,
            newestLog: null
        };

        // Compter par niveau
        Object.keys(this.logLevels).forEach(level => {
            stats.byLevel[level] = this.logs.filter(log => log.level === level).length;
        });

        // Dates extrêmes
        if (this.logs.length > 0) {
            stats.oldestLog = this.logs[0].timestamp;
            stats.newestLog = this.logs[this.logs.length - 1].timestamp;
        }

        return stats;
    }

    /**
     * Configurer le logger avec des options
     * @param {object} options
     */
    configure(options = {}) {
        if (options.logLevel) this.setLogLevel(options.logLevel);
        if (options.hasOwnProperty('enableConsole')) this.setConsoleEnabled(options.enableConsole);
        if (options.hasOwnProperty('enableStorage')) this.setStorageEnabled(options.enableStorage);
        if (options.maxLogs) this.maxLogs = options.maxLogs;
    }

    /**
     * Créer un logger enfant avec un préfixe
     * @param {string} prefix
     * @returns {object}
     */
    createChild(prefix) {
        return {
            debug: (message, data) => this.debug(`[${prefix}] ${message}`, data),
            info: (message, data) => this.info(`[${prefix}] ${message}`, data),
            warn: (message, data) => this.warn(`[${prefix}] ${message}`, data),
            error: (message, data) => this.error(`[${prefix}] ${message}`, data)
        };
    }

    /**
     * Démarrer la surveillance des erreurs globales
     */
    startGlobalErrorTracking() {
        // Erreurs JavaScript
        window.addEventListener('error', (event) => {
            this.error('Erreur JavaScript globale', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // Promesses rejetées
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Promesse rejetée non gérée', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });

        this.info('Surveillance des erreurs globales activée');
    }

    /**
     * Nettoyer le logger
     */
    destroy() {
        this.clearLogs();
        this.sessionId = null;
        console.log('Logger détruit');
    }
}

// Créer une instance globale
const loggerInstance = new Logger();

// Configuration par défaut
loggerInstance.configure({
    logLevel: 'info',
    enableConsole: true,
    enableStorage: true
});

// Démarrer la surveillance des erreurs
loggerInstance.startGlobalErrorTracking();

// Export pour utilisation en module
export { Logger, loggerInstance };
export default loggerInstance;

// Export global pour compatibilité
window.Logger = loggerInstance;
