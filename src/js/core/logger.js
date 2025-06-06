// src/js/utils/Logger.js
// Système de logging pour SYNERGIA v3.0

export class Logger {
    constructor(prefix = 'SYNERGIA', enableDebug = true) {
        this.prefix = prefix;
        this.enableDebug = enableDebug;
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.currentLevel = enableDebug ? this.levels.debug : this.levels.info;
        
        // Styles pour la console
        this.styles = {
            error: 'color: #ef4444; font-weight: bold;',
            warn: 'color: #f59e0b; font-weight: bold;',
            info: 'color: #3b82f6; font-weight: bold;',
            debug: 'color: #6b7280;',
            success: 'color: #10b981; font-weight: bold;',
            prefix: 'color: #6d28d9; font-weight: bold; background: rgba(109, 40, 217, 0.1); padding: 2px 6px; border-radius: 3px;'
        };
        
        // Historique des logs (pour debug)
        this.history = [];
        this.maxHistorySize = 1000;
    }
    
    /**
     * Envoyer vers service externe (production)
     */
    sendToExternalService(level, args) {
        // En production, envoyer vers service de monitoring
        // Exemple: Sentry, LogRocket, etc.
        try {
            if (window.gtag) {
                window.gtag('event', 'exception', {
                    description: args.join(' '),
                    fatal: level === 'error'
                });
            }
            
            // Ici vous pouvez ajouter d'autres services
            // Exemple Sentry:
            // if (window.Sentry) {
            //     window.Sentry.captureException(new Error(args.join(' ')));
            // }
        } catch (error) {
            console.error('Erreur envoi logs externes:', error);
        }
    }
    
    /**
     * Créer un logger enfant avec un préfixe différent
     */
    child(childPrefix) {
        const fullPrefix = `${this.prefix}:${childPrefix}`;
        const childLogger = new Logger(fullPrefix, this.enableDebug);
        childLogger.currentLevel = this.currentLevel;
        return childLogger;
    }
    
    /**
     * Formater les objets pour l'affichage
     */
    formatObject(obj) {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
        
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            return '[Objet non sérialisable]';
        }
    }
    
    /**
     * Logger spécialisé pour les erreurs HTTP
     */
    httpError(method, url, status, response = null) {
        this.error(`HTTP ${status} ${method} ${url}`, response ? { response } : '');
    }
    
    /**
     * Logger spécialisé pour les erreurs Firebase
     */
    firebaseError(operation, error) {
        this.error(`Firebase ${operation}:`, {
            code: error.code,
            message: error.message,
            details: error.details || null
        });
    }
    
    /**
     * Logger pour les métriques de performance
     */
    performance(metric, value, unit = 'ms') {
        this.info(`⚡ Performance: ${metric} = ${value}${unit}`);
        
        // Envoyer vers analytics si disponible
        if (window.gtag) {
            window.gtag('event', 'timing_complete', {
                name: metric,
                value: Math.round(value)
            });
        }
    }
    
    /**
     * Logger pour les événements utilisateur
     */
    userAction(action, details = {}) {
        this.info(`👤 Action utilisateur: ${action}`, details);
        
        // Analytics
        if (window.gtag) {
            window.gtag('event', action, details);
        }
    }
    
    /**
     * Logger pour les états de l'application
     */
    stateChange(from, to, context = {}) {
        this.info(`🔄 État: ${from} → ${to}`, context);
    }
    
    /**
     * Logger pour le debug des composants React-like
     */
    component(name, action, props = {}) {
        if (this.currentLevel >= this.levels.debug) {
            console.log(
                `%c[${this.prefix}] %c🧩 ${name} %c${action}`,
                this.styles.prefix,
                'color: #8b5cf6; font-weight: bold;',
                'color: #6b7280;',
                props
            );
        }
    }
    
    /**
     * Logger pour les WebSocket/temps réel
     */
    realtime(event, data = {}) {
        this.debug(`🔄 Temps réel: ${event}`, data);
    }
    
    /**
     * Logger pour l'authentification
     */
    auth(action, user = null) {
        this.info(`🔐 Auth: ${action}`, user ? { uid: user.uid, email: user.email } : '');
    }
    
    /**
     * Logger pour les erreurs de validation
     */
    validation(field, error, value = null) {
        this.warn(`❌ Validation: ${field} - ${error}`, value ? { value } : '');
    }
    
    /**
     * Logger pour les warnings de développement
     */
    devWarning(message, suggestion = null) {
        if (this.enableDebug) {
            console.warn(
                `%c[${this.prefix}] %c⚠️ DEV WARNING`,
                this.styles.prefix,
                'color: #f59e0b; font-weight: bold; background: rgba(245, 158, 11, 0.1); padding: 2px 6px; border-radius: 3px;',
                message,
                suggestion ? `\n💡 Suggestion: ${suggestion}` : ''
            );
        }
    }
}

// Singleton global pour faciliter l'usage
export const logger = new Logger('SYNERGIA', import.meta.env?.DEV || false);

// Helper functions globales
export function createLogger(prefix, debug = import.meta.env?.DEV) {
    return new Logger(prefix, debug);
}

export function setGlobalLogLevel(level) {
    logger.setLevel(level);
}

// Exposer globalement en mode debug
if (import.meta.env?.DEV) {
    window.logger = logger;
    window.createLogger = createLogger;
} Formater le timestamp
     */
    getTimestamp() {
        return new Date().toLocaleTimeString('fr-FR', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }
    
    /**
     * Ajouter au historique
     */
    addToHistory(level, args) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            prefix: this.prefix,
            message: args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ')
        };
        
        this.history.push(entry);
        
        // Limiter la taille de l'historique
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }
    
    /**
     * Méthode de log générique
     */
    log(level, ...args) {
        if (this.levels[level] > this.currentLevel) {
            return;
        }
        
        // Ajouter à l'historique
        this.addToHistory(level, args);
        
        const timestamp = this.getTimestamp();
        const prefixStyle = this.styles.prefix;
        const levelStyle = this.styles[level] || '';
        
        // Préparer les arguments pour console
        const consoleArgs = [
            `%c[${this.prefix}] %c${level.toUpperCase()} %c${timestamp}`,
            prefixStyle,
            levelStyle,
            'color: #9ca3af; font-size: 0.9em;',
            ...args
        ];
        
        // Utiliser la méthode console appropriée
        switch (level) {
            case 'error':
                console.error(...consoleArgs);
                break;
            case 'warn':
                console.warn(...consoleArgs);
                break;
            case 'debug':
                console.debug(...consoleArgs);
                break;
            default:
                console.log(...consoleArgs);
        }
        
        // En production, envoyer vers service externe
        if (!this.enableDebug && level === 'error') {
            this.sendToExternalService(level, args);
        }
    }
    
    /**
     * Méthodes de logging
     */
    error(...args) {
        this.log('error', ...args);
    }
    
    warn(...args) {
        this.log('warn', ...args);
    }
    
    info(...args) {
        this.log('info', ...args);
    }
    
    debug(...args) {
        this.log('debug', ...args);
    }
    
    success(...args) {
        // Success est une variante d'info avec un style différent
        if (this.levels.info > this.currentLevel) {
            return;
        }
        
        this.addToHistory('success', args);
        
        const timestamp = this.getTimestamp();
        console.log(
            `%c[${this.prefix}] %cSUCCESS %c${timestamp}`,
            this.styles.prefix,
            this.styles.success,
            'color: #9ca3af; font-size: 0.9em;',
            ...args
        );
    }
    
    /**
     * Logger avec grouping
     */
    group(title, callback) {
        if (this.currentLevel < this.levels.debug) {
            return callback?.();
        }
        
        console.group(
            `%c[${this.prefix}] %c${title}`,
            this.styles.prefix,
            this.styles.info
        );
        
        const result = callback?.();
        console.groupEnd();
        
        return result;
    }
    
    /**
     * Logger pour les performances
     */
    time(label) {
        if (this.currentLevel >= this.levels.debug) {
            console.time(`[${this.prefix}] ${label}`);
        }
    }
    
    timeEnd(label) {
        if (this.currentLevel >= this.levels.debug) {
            console.timeEnd(`[${this.prefix}] ${label}`);
        }
    }
    
    /**
     * Logger pour les objets complexes
     */
    table(data, columns) {
        if (this.currentLevel >= this.levels.debug) {
            console.log(`%c[${this.prefix}] TABLE`, this.styles.prefix);
            console.table(data, columns);
        }
    }
    
    /**
     * Logger conditionnel
     */
    assert(condition, ...args) {
        if (!condition) {
            this.error('ASSERTION FAILED:', ...args);
            console.assert(condition, ...args);
        }
    }
    
    /**
     * Tracer la stack
     */
    trace(...args) {
        if (this.currentLevel >= this.levels.debug) {
            console.log(`%c[${this.prefix}] TRACE`, this.styles.prefix, ...args);
            console.trace();
        }
    }
    
    /**
     * Changer le niveau de log
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.currentLevel = this.levels[level];
            this.info(`Niveau de log changé: ${level}`);
        } else {
            this.warn(`Niveau de log invalide: ${level}`);
        }
    }
    
    /**
     * Obtenir l'historique
     */
    getHistory(level = null, limit = null) {
        let history = this.history;
        
        if (level) {
            history = history.filter(entry => entry.level === level);
        }
        
        if (limit) {
            history = history.slice(-limit);
        }
        
        return history;
    }
    
    /**
     * Exporter les logs
     */
    exportLogs(format = 'json') {
        const data = this.getHistory();
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'csv':
                const headers = 'timestamp,level,prefix,message\n';
                const rows = data.map(entry => 
                    `"${entry.timestamp}","${entry.level}","${entry.prefix}","${entry.message.replace(/"/g, '""')}"`
                ).join('\n');
                return headers + rows;
            
            case 'text':
                return data.map(entry => 
                    `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.prefix}] ${entry.message}`
                ).join('\n');
            
            default:
                return data;
        }
    }
    
    /**
     * Télécharger les logs
     */
    downloadLogs(filename = null, format = 'json') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `synergia-logs-${timestamp}.${format}`;
        const finalFilename = filename || defaultFilename;
        
        const content = this.exportLogs(format);
        const blob = new Blob([content], { 
            type: format === 'json' ? 'application/json' : 'text/plain' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.info(`Logs exportés: ${finalFilename}`);
    }
    
    /**
     * Vider l'historique
     */
    clearHistory() {
        const count = this.history.length;
        this.history = [];
        this.info(`Historique vidé (${count} entrées supprimées)`);
    }
    
    /**
     