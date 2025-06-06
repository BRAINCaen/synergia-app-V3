// src/js/modules/timeclock-init.js - Module d'initialisation du pointage corrigé

class TimeClockModule {
  constructor() {
    this.isInitialized = false;
    this.controller = null;
    this.badgingManager = null;
    this.dependencies = new Map();
    
    this.safeInitialize();
  }

  async safeInitialize() {
    try {
      await this.initialize();
      Logger.info('TimeClockModule: Initialisation réussie', null, 'TimeClockModule');
    } catch (error) {
      // Utiliser une méthode de logging sûre
      this.safeLog('error', 'TimeClockModule: Erreur d\'initialisation', error);
      this.showErrorMessage('Erreur lors de l\'initialisation du module de pointage');
    }
  }

  // Méthode de logging sûre qui ne dépend pas de Logger
  safeLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [TimeClockModule] ${message}`;
    
    if (typeof Logger !== 'undefined' && Logger[level]) {
      Logger[level](message, data, 'TimeClockModule');
    } else {
      // Fallback vers console si Logger n'est pas disponible
      switch (level) {
        case 'error':
          console.error(logMessage, data || '');
          break;
        case 'warn':
          console.warn(logMessage, data || '');
          break;
        case 'info':
          console.info(logMessage, data || '');
          break;
        default:
          console.log(logMessage, data || '');
      }
    }
  }

  async initialize() {
    try {
      // Vérifier les dépendances de base
      await this.checkBasicDependencies();
      
      // Attendre que le DOM soit prêt
      await this.waitForDOM();
      
      // Charger les dépendances requises
      await this.loadDependencies();
      
      // Vérifier les dépendances avancées
      await this.checkAdvancedDependencies();
      
      // Initialiser les managers
      await this.initializeManagers();
      
      // Initialiser le contrôleur
      await this.initializeController();
      
      // Configurer les interactions
      this.setupInteractions();
      
      this.isInitialized = true;
      this.safeLog('info', 'Module TimeClockModule initialisé avec succès');
      
    } catch (error) {
      this.safeLog('error', 'Erreur lors de l\'initialisation du module', error);
      throw error;
    }
  }

  async checkBasicDependencies() {
    const basicDeps = [
      { name: 'document', object: document },
      { name: 'window', object: window }
    ];

    for (const dep of basicDeps) {
      if (!dep.object) {
        throw new Error(`Dépendance de base manquante: ${dep.name}`);
      }
    }
  }

  async waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  async loadDependencies() {
    const dependenciesToLoad = [
      {
        name: 'Logger',
        check: () => typeof window.Logger !== 'undefined',
        load: () => this.loadScript('/src/js/core/logger.js')
      },
      {
        name: 'Firebase',
        check: () => typeof firebase !== 'undefined',
        load: () => Promise.resolve() // Firebase devrait déjà être chargé
      },
      {
        name: 'BadgingManager',
        check: () => typeof window.BadgingManager !== 'undefined',
        load: () => this.loadScript('/src/js/managers/BadgingManager.js')
      },
      {
        name: 'TimeClockController',
        check: () => typeof window.TimeClockController !== 'undefined',
        load: () => this.loadScript('/src/js/controllers/timeclock-controller.js')
      }
    ];

    for (const dep of dependenciesToLoad) {
      if (!dep.check()) {
        this.safeLog('info', `Chargement de la dépendance: ${dep.name}`);
        try {
          await dep.load();
          await this.waitForDependency(dep.check, 5000);
          this.dependencies.set(dep.name, true);
        } catch (error) {
          this.safeLog('error', `Erreur lors du chargement de ${dep.name}`, error);
          throw new Error(`Impossible de charger la dépendance: ${dep.name}`);
        }
      } else {
        this.dependencies.set(dep.name, true);
      }
    }
  }

  async loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger le script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async waitForDependency(checkFunction, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (checkFunction()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout lors de l\'attente de la dépendance'));
        } else {
          setTimeout(check, 100);
        }
      };
      
      check();
    });
  }

  async checkAdvancedDependencies() {
    const advancedDeps = [
      {
        name: 'Logger',
        check: () => typeof Logger !== 'undefined' && typeof Logger.error === 'function'
      },
      {
        name: 'Firebase Auth',
        check: () => typeof firebase !== 'undefined' && firebase.auth
      },
      {
        name: 'Firebase Firestore',
        check: () => typeof firebase !== 'undefined' && firebase.firestore
      },
      {
        name: 'BadgingManager Class',
        check: () => typeof BadgingManager === 'function'
      },
      {
        name: 'TimeClockController Class',
        check: () => typeof TimeClockController === 'function'
      }
    ];

    for (const dep of advancedDeps) {
      if (!dep.check()) {
        throw new Error(`Dépendance avancée manquante ou invalide: ${dep.name}`);
      }
    }

    this.safeLog('info', 'Toutes les dépendances avancées sont disponibles');
  }

  async initializeManagers() {
    try {
      // Initialiser le BadgingManager
      this.badgingManager = new BadgingManager();
      
      // Attendre que le manager soit prêt
      await this.waitForManagerInitialization();
      
      // Stocker globalement pour accès depuis d'autres modules
      window.badgingManager = this.badgingManager;
      
      this.safeLog('info', 'BadgingManager initialisé');
      
    } catch (error) {
      this.safeLog('error', 'Erreur lors de l\'initialisation des managers', error);
      throw error;
    }
  }

  async waitForManagerInitialization() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout lors de l\'initialisation du BadgingManager'));
      }, 10000);

      const checkInitialization = () => {
        if (this.badgingManager && this.badgingManager.initialized) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkInitialization, 100);
        }
      };

      checkInitialization();
    });
  }

  async initializeController() {
    try {
      // Vérifier que les éléments DOM nécessaires existent
      await this.verifyDOMElements();
      
      // Initialiser le contrôleur
      this.controller = new TimeClockController();
      
      // Stocker globalement
      window.timeClockController = this.controller;
      
      this.safeLog('info', 'TimeClockController initialisé');
      
    } catch (error) {
      this.safeLog('error', 'Erreur lors de l\'initialisation du contrôleur', error);
      throw error;
    }
  }

  async verifyDOMElements() {
    const requiredElements = [
      'current-time',
      'current-status'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      // Essayer de créer les éléments manquants ou charger le template
      await this.ensureTemplateLoaded();
      
      // Vérifier à nouveau
      const stillMissing = requiredElements.filter(id => !document.getElementById(id));
      
      if (stillMissing.length > 0) {
        throw new Error(`Éléments DOM critiques manquants: ${stillMissing.join(', ')}`);
      }
    }
  }

  async ensureTemplateLoaded() {
    try {
      // Vérifier si le template est déjà chargé
      const timeclockContainer = document.getElementById('timeclock-container');
      if (timeclockContainer && timeclockContainer.children.length > 0) {
        return; // Template déjà chargé
      }

      // Charger le template depuis le fichier
      const templateResponse = await fetch('/src/templates/timeclock.html');
      if (!templateResponse.ok) {
        throw new Error(`Impossible de charger le template: ${templateResponse.status}`);
      }

      const templateHTML = await templateResponse.text();
      
      // Injecter le template dans le container
      if (timeclockContainer) {
        timeclockContainer.innerHTML = templateHTML;
      } else {
        // Créer le container si nécessaire
        const container = document.createElement('div');
        container.id = 'timeclock-container';
        container.innerHTML = templateHTML;
        
        const mainContent = document.querySelector('#app') || document.body;
        mainContent.appendChild(container);
      }

      this.safeLog('info', 'Template timeclock chargé avec succès');
      
    } catch (error) {
      this.safeLog('error', 'Erreur lors du chargement du template', error);
      
      // Créer une interface de base en cas d'échec
      this.createFallbackInterface();
    }
  }

  createFallbackInterface() {
    const fallbackHTML = `
      <div class="timeclock-fallback">
        <div class="clock-widget">
          <div id="current-time">--:--:--</div>
          <div id="current-date">--</div>
          <div id="current-status">Chargement...</div>
          
          <div class="badge-buttons">
            <button id="check-in-btn" class="btn btn-success btn-lg">
              <i class="fas fa-sign-in-alt"></i> Entrée
            </button>
            <button id="check-out-btn" class="btn btn-danger btn-lg" disabled>
              <i class="fas fa-sign-out-alt"></i> Sortie
            </button>
          </div>
          
          <div class="break-buttons">
            <button id="break-start-btn" class="btn btn-warning btn-lg" disabled>
              <i class="fas fa-pause"></i> Pause
            </button>
            <button id="break-end-btn" class="btn btn-info btn-lg" disabled>
              <i class="fas fa-play"></i> Reprise
            </button>
          </div>
          
          <div class="comment-section">
            <textarea id="comment-input" placeholder="Commentaire (optionnel)"></textarea>
          </div>
          
          <div class="remote-section">
            <label>
              <input type="checkbox" id="remote-work-checkbox">
              Travail à distance
            </label>
          </div>
          
          <div id="work-timer" class="work-timer">00:00:00</div>
          <div id="break-indicator" class="break-indicator" style="display: none;">En pause</div>
        </div>
      </div>
    `;

    const container = document.getElementById('timeclock-container') || document.createElement('div');
    container.id = 'timeclock-container';
    container.innerHTML = fallbackHTML;
    
    if (!document.getElementById('timeclock-container')) {
      const mainContent = document.querySelector('#app') || document.body;
      mainContent.appendChild(container);
    }

    this.safeLog('info', 'Interface de secours créée');
  }

  setupInteractions() {
    try {
      // Configurer les interactions entre les composants
      if (this.badgingManager && this.controller) {
        
        // Écouter les événements du BadgingManager
        this.badgingManager.addEventListener('checkin', (data) => {
          this.safeLog('info', 'Événement check-in reçu', data);
          this.updateUIAfterCheckin(data);
        });

        this.badgingManager.addEventListener('checkout', (data) => {
          this.safeLog('info', 'Événement check-out reçu', data);
          this.updateUIAfterCheckout(data);
        });

        this.badgingManager.addEventListener('breakstart', (data) => {
          this.safeLog('info', 'Événement début de pause reçu', data);
          this.updateUIAfterBreakStart(data);
        });

        this.badgingManager.addEventListener('breakend', (data) => {
          this.safeLog('info', 'Événement fin de pause reçu', data);
          this.updateUIAfterBreakEnd(data);
        });
      }

      // Configurer les raccourcis clavier globaux
      this.setupGlobalKeyboardShortcuts();

      // Configurer la synchronisation automatique
      this.setupAutoSync();

      this.safeLog('info', 'Interactions configurées avec succès');

    } catch (error) {
      this.safeLog('error', 'Erreur lors de la configuration des interactions', error);
    }
  }

  updateUIAfterCheckin(sessionData) {
    try {
      // Mettre à jour l'interface après un check-in
      const statusElement = document.getElementById('current-status');
      if (statusElement) {
        statusElement.textContent = 'En service';
        statusElement.className = 'status online';
      }

      // Désactiver le bouton d'entrée, activer celui de sortie
      const checkInBtn = document.getElementById('check-in-btn');
      const checkOutBtn = document.getElementById('check-out-btn');
      const breakStartBtn = document.getElementById('break-start-btn');

      if (checkInBtn) checkInBtn.disabled = true;
      if (checkOutBtn) checkOutBtn.disabled = false;
      if (breakStartBtn) breakStartBtn.disabled = false;

      // Vider le champ de commentaire
      const commentInput = document.getElementById('comment-input');
      if (commentInput) commentInput.value = '';

    } catch (error) {
      this.safeLog('error', 'Erreur lors de la mise à jour UI après check-in', error);
    }
  }

  updateUIAfterCheckout(sessionData) {
    try {
      const statusElement = document.getElementById('current-status');
      if (statusElement) {
        statusElement.textContent = 'Hors service';
        statusElement.className = 'status offline';
      }

      // Réactiver le bouton d'entrée, désactiver les autres
      const checkInBtn = document.getElementById('check-in-btn');
      const checkOutBtn = document.getElementById('check-out-btn');
      const breakStartBtn = document.getElementById('break-start-btn');
      const breakEndBtn = document.getElementById('break-end-btn');

      if (checkInBtn) checkInBtn.disabled = false;
      if (checkOutBtn) checkOutBtn.disabled = true;
      if (breakStartBtn) breakStartBtn.disabled = true;
      if (breakEndBtn) breakEndBtn.disabled = true;

      // Réinitialiser les indicateurs
      const workTimer = document.getElementById('work-timer');
      const breakIndicator = document.getElementById('break-indicator');
      
      if (workTimer) workTimer.textContent = '00:00:00';
      if (breakIndicator) breakIndicator.style.display = 'none';

    } catch (error) {
      this.safeLog('error', 'Erreur lors de la mise à jour UI après check-out', error);
    }
  }

  updateUIAfterBreakStart(data) {
    try {
      const statusElement = document.getElementById('current-status');
      if (statusElement) {
        statusElement.textContent = 'En pause';
        statusElement.className = 'status break';
      }

      const breakStartBtn = document.getElementById('break-start-btn');
      const breakEndBtn = document.getElementById('break-end-btn');
      const breakIndicator = document.getElementById('break-indicator');

      if (breakStartBtn) breakStartBtn.disabled = true;
      if (breakEndBtn) breakEndBtn.disabled = false;
      if (breakIndicator) breakIndicator.style.display = 'block';

    } catch (error) {
      this.safeLog('error', 'Erreur lors de la mise à jour UI après début de pause', error);
    }
  }

  updateUIAfterBreakEnd(data) {
    try {
      const statusElement = document.getElementById('current-status');
      if (statusElement) {
        statusElement.textContent = 'En service';
        statusElement.className = 'status online';
      }

      const breakStartBtn = document.getElementById('break-start-btn');
      const breakEndBtn = document.getElementById('break-end-btn');
      const breakIndicator = document.getElementById('break-indicator');

      if (breakStartBtn) breakStartBtn.disabled = false;
      if (breakEndBtn) breakEndBtn.disabled = true;
      if (breakIndicator) breakIndicator.style.display = 'none';

    } catch (error) {
      this.safeLog('error', 'Erreur lors de la mise à jour UI après fin de pause', error);
    }
  }

  setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ignorer si l'utilisateur tape dans un champ de texte
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'h':
            event.preventDefault();
            this.showHelp();
            break;
          case 'r':
            event.preventDefault();
            this.refreshModule();
            break;
        }
      }
    });
  }

  setupAutoSync() {
    // Synchroniser l'état toutes les 30 secondes
    setInterval(() => {
      if (this.badgingManager && this.badgingManager.initialized) {
        this.badgingManager.loadCurrentSession().catch(error => {
          this.safeLog('warn', 'Erreur lors de la synchronisation automatique', error);
        });
      }
    }, 30000);

    // Synchroniser lors du retour de focus
    window.addEventListener('focus', () => {
      if (this.badgingManager && this.badgingManager.initialized) {
        this.badgingManager.loadCurrentSession().catch(error => {
          this.safeLog('warn', 'Erreur lors de la synchronisation au focus', error);
        });
      }
    });
  }

  showHelp() {
    const helpMessage = `
Raccourcis clavier du module de pointage:

Ctrl+I : Pointage d'entrée
Ctrl+O : Pointage de sortie  
Ctrl+P : Basculer pause
Ctrl+H : Afficher cette aide
Ctrl+R : Actualiser le module

Les boutons sont également disponibles dans l'interface.
    `;

    if (window.NotificationManager) {
      window.NotificationManager.showInfo(helpMessage);
    } else {
      alert(helpMessage);
    }
  }

  async refreshModule() {
    try {
      this.safeLog('info', 'Actualisation du module demandée');
      
      if (this.badgingManager) {
        await this.badgingManager.loadCurrentSession();
      }
      
      if (this.controller && this.controller.loadCurrentState) {
        await this.controller.loadCurrentState();
      }
      
      this.showSuccessMessage('Module actualisé');
      
    } catch (error) {
      this.safeLog('error', 'Erreur lors de l\'actualisation', error);
      this.showErrorMessage('Erreur lors de l\'actualisation');
    }
  }

  showSuccessMessage(message) {
    if (window.NotificationManager) {
      window.NotificationManager.showSuccess(message);
    } else {
      console.log('✅', message);
    }
  }

  showErrorMessage(message) {
    if (window.NotificationManager) {
      window.NotificationManager.showError(message);
    } else {
      console.error('❌', message);
    }
  }

  // Méthodes de diagnostic
  getDiagnosticInfo() {
    return {
      isInitialized: this.isInitialized,
      dependencies: Object.fromEntries(this.dependencies),
      hasController: !!this.controller,
      hasBadgingManager: !!this.badgingManager,
      controllerInitialized: this.controller?.isInitialized,
      badgingManagerInitialized: this.badgingManager?.initialized,
      timestamp: new Date().toISOString()
    };
  }

  // Nettoyage
  destroy() {
    try {
      // Nettoyer le contrôleur
      if (this.controller && typeof this.controller.destroy === 'function') {
        this.controller.destroy();
      }

      // Nettoyer le manager
      if (this.badgingManager && typeof this.badgingManager.destroy === 'function') {
        this.badgingManager.destroy();
      }

      // Nettoyer les références globales
      if (window.timeClockController === this.controller) {
        delete window.timeClockController;
      }
      
      if (window.badgingManager === this.badgingManager) {
        delete window.badgingManager;
      }

      this.controller = null;
      this.badgingManager = null;
      this.dependencies.clear();
      this.isInitialized = false;

      this.safeLog('info', 'Module TimeClockModule nettoyé');

    } catch (error) {
      this.safeLog('error', 'Erreur lors du nettoyage du module', error);
    }
  }
}

// Auto-initialisation si le script est chargé directement
if (typeof window !== 'undefined') {
  window.TimeClockModule = TimeClockModule;
  
  // Initialiser automatiquement si pas déjà fait
  if (!window.timeClockModule) {
    window.timeClockModule = new TimeClockModule();
  }
}

// Exporter pour les modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeClockModule;
}

// Log de chargement
if (typeof Logger !== 'undefined') {
  Logger.debug('TimeClockModule: Classe chargée', null, 'TimeClockModule');
} else {
  console.log('[TimeClockModule] Classe chargée');
}
