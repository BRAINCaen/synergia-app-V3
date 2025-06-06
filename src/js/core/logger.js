// src/js/core/logger.js - Système de logging SYNERGIA v3.0

class Logger {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.logHistory = [];
    this.maxHistorySize = 1000;
    this.isInitialized = true;
  }

  // Niveaux de log
  static LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };

  // Obtenir le niveau de log basé sur l'environnement
  getLogLevel() {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return Logger.LEVELS.DEBUG;
      }
    }
    
    // En production, seulement ERROR et WARN
    return Logger.LEVELS.WARN;
  }

  // Formater le message avec timestamp et contexte
  formatMessage(level, message, data = null, context = '') {
    const timestamp = new Date().toISOString();
    const levelStr = Object.keys(Logger.LEVELS)[level];
    const contextStr = context ? ` [${context}]` : '';
    
    return {
      timestamp,
      level: levelStr,
      message,
      context,
      data,
      formatted: `[${timestamp}]${contextStr} [${levelStr}] ${message}`
    };
  }

  // Ajouter à l'historique
  addToHistory(logEntry) {
    try {
      this.logHistory.push(logEntry);
      
      // Limiter la taille de l'historique
      if (this.logHistory.length > this.maxHistorySize) {
        this.logHistory = this.logHistory.slice(-this.maxHistorySize);
      }
    } catch (error) {
      // Si on ne peut pas ajouter à l'historique, on continue sans faire planter
      console.warn('Logger: Impossible d\'ajouter à l\'historique:', error);
    }
  }

  // Log générique
  log(level, message, data = null, context = '') {
    try {
      if (level > this.logLevel) {
        return; // Niveau trop bas, on ignore
      }

      const logEntry = this.formatMessage(level, message, data, context);
      this.addToHistory(logEntry);

      // Afficher dans la console selon le niveau
      switch (level) {
        case Logger.LEVELS.ERROR:
          if (data) {
            console.error(logEntry.formatted, data);
          } else {
            console.error(logEntry.formatted);
          }
          break;
        case Logger.LEVELS.WARN:
          if (data) {
            console.warn(logEntry.formatted, data);
          } else {
            console.warn(logEntry.formatted);
          }
          break;
        case Logger.LEVELS.INFO:
          if (data) {
            console.info(logEntry.formatted, data);
          } else {
            console.info(logEntry.formatted);
          }
          break;
        case Logger.LEVELS.DEBUG:
          if (data) {
            console.debug(logEntry.formatted, data);
          } else {
            console.debug(logEntry.formatted);
          }
          break;
        default:
          if (data) {
            console.log(logEntry.formatted, data);
          } else {
            console.log(logEntry.formatted);
          }
      }

      // Envoyer les erreurs critiques à un service de monitoring (optionnel)
      if (level === Logger.LEVELS.ERROR && window.errorReporting) {
        try {
          window.errorReporting.captureError(message, data);
        } catch (reportingError) {
          console.warn('Logger: Impossible d\'envoyer l\'erreur au service de monitoring:', reportingError);
        }
      }

    } catch (error) {
      // Fallback en cas d'erreur dans le logger lui-même
      console.error('Logger: Erreur interne du logger:', error);
      console.error('Message original:', message, data);
    }
  }

  // Méthodes publiques
  error(message, data = null, context = '') {
    this.log(Logger.LEVELS.ERROR, message, data, context);
  }

  warn(message, data = null, context = '') {
    this.log(Logger.LEVELS.WARN, message, data, context);
  }

  info(message, data = null, context = '') {
    this.log(Logger.LEVELS.INFO, message, data, context);
  }

  debug(message, data = null, context = '') {
    this.log(Logger.LEVELS.DEBUG, message, data, context);
  }

  // Méthodes utilitaires
  getHistory() {
    return [...this.logHistory];
  }

  clearHistory() {
    this.logHistory = [];
    this.info('Logger: Historique nettoyé');
  }

  exportLogs() {
    try {
      const logs = this.getHistory();
      const logData = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        logs: logs
      };
      
      const dataStr = JSON.stringify(logData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `synergia-logs-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      this.info('Logger: Logs exportés avec succès');
    } catch (error) {
      this.error('Logger: Erreur lors de l\'export des logs', error);
    }
  }

  // Méthode pour loguer les erreurs JavaScript non capturées
  setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
      this.error('Erreur JavaScript non capturée', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      }, 'GlobalError');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Promise rejetée non gérée', {
        reason: event.reason,
        promise: event.promise
      }, 'UnhandledPromise');
    });
  }

  // Configuration du niveau de log
  setLogLevel(level) {
    if (Object.values(Logger.LEVELS).includes(level)) {
      this.logLevel = level;
      this.info(`Logger: Niveau de log changé vers ${Object.keys(Logger.LEVELS)[level]}`);
    } else {
      this.warn('Logger: Niveau de log invalide:', level);
    }
  }
}

// Créer une instance globale
const logger = new Logger();

// Méthodes statiques pour compatibilité
Logger.log = (message, data = null, context = '') => {
  logger.info(message, data, context);
};

Logger.error = (message, data = null, context = '') => {
  logger.error(message, data, context);
};

Logger.warn = (message, data = null, context = '') => {
  logger.warn(message, data, context);
};

Logger.info = (message, data = null, context = '') => {
  logger.info(message, data, context);
};

Logger.debug = (message, data = null, context = '') => {
  logger.debug(message, data, context);
};

// Configurer la gestion d'erreurs globale
logger.setupGlobalErrorHandling();

// Exporter pour utilisation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
} else if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.logger = logger;
}

// Log d'initialisation
logger.info('Logger: Système de logging initialisé', null, 'Logger');
