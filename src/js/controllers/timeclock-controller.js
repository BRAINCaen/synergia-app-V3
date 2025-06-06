// src/js/controllers/timeclock-controller.js - Contrôleur de pointage corrigé

class TimeClockController {
  constructor() {
    this.isInitialized = false;
    this.elements = new Map();
    this.timers = new Map();
    this.eventListeners = new Map();
    this.currentSession = null;
    this.isOnBreak = false;
    
    // Bind des méthodes pour conserver le contexte
    this.handleCheckIn = this.handleCheckIn.bind(this);
    this.handleCheckOut = this.handleCheckOut.bind(this);
    this.handleBreakStart = this.handleBreakStart.bind(this);
    this.handleBreakEnd = this.handleBreakEnd.bind(this);
    this.updateClock = this.updateClock.bind(this);
    
    this.safeInitialize();
  }

  async safeInitialize() {
    try {
      await this.waitForDOM();
      await this.initialize();
      Logger.info('TimeClockController: Initialisation réussie', null, 'TimeClockController');
    } catch (error) {
      Logger.error('TimeClockController: Erreur d\'initialisation', error, 'TimeClockController');
      this.showErrorMessage('Erreur lors de l\'initialisation du système de pointage');
    }
  }

  // Attendre que le DOM soit prêt
  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  async initialize() {
    try {
      // Vérifier les dépendances
      await this.checkDependencies();
      
      // Initialiser les éléments DOM
      this.cacheDOMElements();
      
      // Configurer les event listeners
      this.setupEventListeners();
      
      // Démarrer l'horloge
      this.startClock();
      
      // Charger l'état actuel
      await this.loadCurrentState();
      
      this.isInitialized = true;
      
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors de l\'initialisation', error, 'TimeClockController');
      throw error;
    }
  }

  // Vérifier que les dépendances sont disponibles
  async checkDependencies() {
    const dependencies = [
      { name: 'Logger', object: window.Logger },
      { name: 'firebase', object: window.firebase },
      { name: 'BadgingManager', object: window.BadgingManager }
    ];

    for (const dep of dependencies) {
      if (!dep.object) {
        throw new Error(`Dépendance manquante: ${dep.name}`);
      }
    }

    // Vérifier que Firebase est initialisé
    if (!firebase.apps.length) {
      throw new Error('Firebase n\'est pas initialisé');
    }
  }

  // Cacher les éléments DOM nécessaires
  cacheDOMElements() {
    const elementIds = [
      'check-in-btn',
      'check-out-btn',
      'break-start-btn',
      'break-end-btn',
      'current-time',
      'current-date',
      'current-status',
      'work-timer',
      'break-indicator',
      'comment-input',
      'remote-work-checkbox'
    ];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.elements.set(id, element);
        Logger.debug(`TimeClockController: Élément '${id}' trouvé`, null, 'TimeClockController');
      } else {
        Logger.warn(`TimeClockController: Élément '${id}' non trouvé`, null, 'TimeClockController');
      }
    });

    // Vérifier les éléments critiques
    const criticalElements = ['current-time', 'current-status'];
    const missingCritical = criticalElements.filter(id => !this.elements.has(id));
    
    if (missingCritical.length > 0) {
      throw new Error(`Éléments critiques manquants: ${missingCritical.join(', ')}`);
    }
  }

  // Configurer les event listeners
  setupEventListeners() {
    const buttonConfigs = [
      { id: 'check-in-btn', handler: this.handleCheckIn },
      { id: 'check-out-btn', handler: this.handleCheckOut },
      { id: 'break-start-btn', handler: this.handleBreakStart },
      { id: 'break-end-btn', handler: this.handleBreakEnd }
    ];

    buttonConfigs.forEach(config => {
      const element = this.elements.get(config.id);
      if (element) {
        element.addEventListener('click', config.handler);
        this.eventListeners.set(config.id, config.handler);
        Logger.debug(`TimeClockController: Event listener ajouté pour '${config.id}'`, null, 'TimeClockController');
      }
    });

    // Event listener pour les raccourcis clavier
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }

  // Démarrer l'horloge
  startClock() {
    if (this.timers.has('clock')) {
      clearInterval(this.timers.get('clock'));
    }

    const clockTimer = setInterval(this.updateClock, 1000);
    this.timers.set('clock', clockTimer);
    
    // Mettre à jour immédiatement
    this.updateClock();
    
    Logger.debug('TimeClockController: Horloge démarrée', null, 'TimeClockController');
  }

  // Mettre à jour l'affichage de l'horloge
  updateClock() {
    try {
      const now = new Date();
      
      // Mettre à jour l'heure
      const timeElement = this.elements.get('current-time');
      if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }

      // Mettre à jour la date
      const dateElement = this.elements.get('current-date');
      if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // Mettre à jour le timer de travail si en session
      this.updateWorkTimer();
      
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors de la mise à jour de l\'horloge', error, 'TimeClockController');
    }
  }

  // Mettre à jour le timer de travail
  updateWorkTimer() {
    if (!this.currentSession || !this.currentSession.checkInTime) {
      return;
    }

    try {
      const checkInTime = this.currentSession.checkInTime.toDate();
      const now = new Date();
      const workDuration = Math.floor((now - checkInTime) / 1000);

      const hours = Math.floor(workDuration / 3600);
      const minutes = Math.floor((workDuration % 3600) / 60);
      const seconds = workDuration % 60;

      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const timerElement = this.elements.get('work-timer');
      if (timerElement) {
        timerElement.textContent = formattedTime;
      }
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors de la mise à jour du timer', error, 'TimeClockController');
    }
  }

  // Charger l'état actuel depuis la base de données
  async loadCurrentState() {
    try {
      if (!firebase.auth().currentUser) {
        this.updateStatus('Non connecté', 'offline');
        return;
      }

      // Utiliser BadgingManager pour charger l'état
      if (window.BadgingManager) {
        const badgingManager = new BadgingManager();
        this.currentSession = await badgingManager.getCurrentSession();
        this.updateUIFromSession();
      }
      
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors du chargement de l\'état', error, 'TimeClockController');
      this.updateStatus('Erreur de chargement', 'error');
    }
  }

  // Mettre à jour l'interface depuis la session
  updateUIFromSession() {
    if (!this.currentSession) {
      this.updateStatus('Pas de session active', 'offline');
      this.enableButton('check-in-btn');
      this.disableButton('check-out-btn');
      this.disableButton('break-start-btn');
      this.disableButton('break-end-btn');
      return;
    }

    if (this.currentSession.status === 'active') {
      this.updateStatus('En service', 'online');
      this.disableButton('check-in-btn');
      this.enableButton('check-out-btn');
      this.enableButton('break-start-btn');
      this.disableButton('break-end-btn');
    } else if (this.currentSession.status === 'break') {
      this.updateStatus('En pause', 'break');
      this.isOnBreak = true;
      this.disableButton('check-in-btn');
      this.enableButton('check-out-btn');
      this.disableButton('break-start-btn');
      this.enableButton('break-end-btn');
    }
  }

  // Gestionnaires d'événements
  async handleCheckIn() {
    try {
      this.disableButton('check-in-btn');
      
      if (!firebase.auth().currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      const comment = this.getCommentValue();
      const isRemote = this.getRemoteWorkValue();

      if (window.BadgingManager) {
        const badgingManager = new BadgingManager();
        await badgingManager.checkIn(comment, isRemote);
        
        this.currentSession = await badgingManager.getCurrentSession();
        this.updateUIFromSession();
        
        Logger.info('TimeClockController: Check-in réussi', null, 'TimeClockController');
        this.showSuccessMessage('Pointage d\'entrée enregistré');
      }
      
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors du check-in', error, 'TimeClockController');
      this.showErrorMessage('Erreur lors du pointage d\'entrée');
      this.enableButton('check-in-btn');
    }
  }

  async handleCheckOut() {
    try {
      this.disableButton('check-out-btn');
      
      const comment = this.getCommentValue();

      if (window.BadgingManager) {
        const badgingManager = new BadgingManager();
        await badgingManager.checkOut(comment);
        
        this.currentSession = null;
        this.isOnBreak = false;
        this.updateUIFromSession();
        
        Logger.info('TimeClockController: Check-out réussi', null, 'TimeClockController');
        this.showSuccessMessage('Pointage de sortie enregistré');
      }
      
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors du check-out', error, 'TimeClockController');
      this.showErrorMessage('Erreur lors du pointage de sortie');
      this.enableButton('check-out-btn');
    }
  }

  async handleBreakStart() {
    try {
      this.disableButton('break-start-btn');
      
      if (window.BadgingManager) {
        const badgingManager = new BadgingManager();
        await badgingManager.startBreak();
        
        this.isOnBreak = true;
        this.updateStatus('En pause', 'break');
        this.enableButton('break-end-btn');
        
        Logger.info('TimeClockController: Début de pause', null, 'TimeClockController');
        this.showSuccessMessage('Pause démarrée');
      }
      
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors du début de pause', error, 'TimeClockController');
      this.showErrorMessage('Erreur lors du début de pause');
      this.enableButton('break-start-btn');
    }
  }

  async handleBreakEnd() {
    try {
      this.disableButton('break-end-btn');
      
      if (window.BadgingManager) {
        const badgingManager = new BadgingManager();
        await badgingManager.endBreak();
        
        this.isOnBreak = false;
        this.updateStatus('En service', 'online');
        this.enableButton('break-start-btn');
        
        Logger.info('TimeClockController: Fin de pause', null, 'TimeClockController');
        this.showSuccessMessage('Pause terminée');
      }
      
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors de la fin de pause', error, 'TimeClockController');
      this.showErrorMessage('Erreur lors de la fin de pause');
      this.enableButton('break-end-btn');
    }
  }

  // Gestion des raccourcis clavier
  handleKeyboardShortcuts(event) {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'i':
          event.preventDefault();
          if (!this.elements.get('check-in-btn')?.disabled) {
            this.handleCheckIn();
          }
          break;
        case 'o':
          event.preventDefault();
          if (!this.elements.get('check-out-btn')?.disabled) {
            this.handleCheckOut();
          }
          break;
        case 'p':
          event.preventDefault();
          if (!this.isOnBreak && !this.elements.get('break-start-btn')?.disabled) {
            this.handleBreakStart();
          } else if (this.isOnBreak && !this.elements.get('break-end-btn')?.disabled) {
            this.handleBreakEnd();
          }
          break;
      }
    }
  }

  // Méthodes utilitaires
  updateStatus(status, type = 'info') {
    const statusElement = this.elements.get('current-status');
    if (statusElement) {
      statusElement.textContent = status;
      statusElement.className = `status ${type}`;
    }

    const breakIndicator = this.elements.get('break-indicator');
    if (breakIndicator) {
      breakIndicator.style.display = this.isOnBreak ? 'block' : 'none';
    }
  }

  enableButton(buttonId) {
    const button = this.elements.get(buttonId);
    if (button) {
      button.disabled = false;
      button.classList.remove('disabled');
    }
  }

  disableButton(buttonId) {
    const button = this.elements.get(buttonId);
    if (button) {
      button.disabled = true;
      button.classList.add('disabled');
    }
  }

  getCommentValue() {
    const commentElement = this.elements.get('comment-input');
    return commentElement ? commentElement.value.trim() : '';
  }

  getRemoteWorkValue() {
    const remoteElement = this.elements.get('remote-work-checkbox');
    return remoteElement ? remoteElement.checked : false;
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

  // Nettoyage
  destroy() {
    try {
      // Arrêter tous les timers
      this.timers.forEach((timer, key) => {
        clearInterval(timer);
        Logger.debug(`TimeClockController: Timer '${key}' arrêté`, null, 'TimeClockController');
      });
      this.timers.clear();

      // Supprimer tous les event listeners
      this.eventListeners.forEach((handler, elementId) => {
        const element = this.elements.get(elementId);
        if (element) {
          element.removeEventListener('click', handler);
        }
      });
      this.eventListeners.clear();

      // Supprimer l'event listener du clavier
      document.removeEventListener('keydown', this.handleKeyboardShortcuts);

      this.elements.clear();
      this.isInitialized = false;
      
      Logger.info('TimeClockController: Nettoyage terminé', null, 'TimeClockController');
    } catch (error) {
      Logger.error('TimeClockController: Erreur lors du nettoyage', error, 'TimeClockController');
    }
  }
}

// Exporter la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeClockController;
} else if (typeof window !== 'undefined') {
  window.TimeClockController = TimeClockController;
}

Logger.debug('TimeClockController: Classe chargée', null, 'TimeClockController');
