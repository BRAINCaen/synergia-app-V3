// src/js/managers/BadgingManager.js - Gestionnaire de pointage corrigé

class BadgingManager {
  constructor() {
    this.currentUser = null;
    this.currentSession = null;
    this.isOnBreak = false;
    this.breakStartTime = null;
    this.initialized = false;
    
    this.safeInitialize();
  }

  async safeInitialize() {
    try {
      await this.initialize();
      Logger.info('BadgingManager: Initialisation réussie', null, 'BadgingManager');
    } catch (error) {
      Logger.error('BadgingManager: Erreur d\'initialisation', error, 'BadgingManager');
      throw error;
    }
  }

  async initialize() {
    try {
      // Vérifier les dépendances
      this.checkDependencies();
      
      // Attendre l'authentification Firebase
      await this.waitForAuth();
      
      // Charger la session actuelle
      await this.loadCurrentSession();
      
      this.initialized = true;
      
    } catch (error) {
      Logger.error('BadgingManager: Erreur lors de l\'initialisation', error, 'BadgingManager');
      throw error;
    }
  }

  checkDependencies() {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase n\'est pas disponible');
    }

    if (!firebase.apps.length) {
      throw new Error('Firebase n\'est pas initialisé');
    }

    if (typeof Logger === 'undefined') {
      throw new Error('Logger n\'est pas disponible');
    }
  }

  async waitForAuth() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout d\'authentification'));
      }, 10000);

      const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
        clearTimeout(timeout);
        unsubscribe();
        
        if (user) {
          this.currentUser = user;
          Logger.info('BadgingManager: Utilisateur authentifié', { uid: user.uid }, 'BadgingManager');
          resolve(user);
        } else {
          reject(new Error('Utilisateur non authentifié'));
        }
      });
    });
  }

  async loadCurrentSession() {
    if (!this.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Essayer d'abord une requête simple sans index
      const sessionsRef = firebase.firestore().collection('timeclock_sessions');
      
      try {
        // Requête avec index (préférée)
        const query = sessionsRef
          .where('userId', '==', this.currentUser.uid)
          .where('date', '==', today)
          .orderBy('createdAt', 'desc')
          .limit(1);

        const snapshot = await query.get();
        
        if (!snapshot.empty) {
          const sessionDoc = snapshot.docs[0];
          this.currentSession = {
            id: sessionDoc.id,
            ...sessionDoc.data()
          };
          
          // Vérifier le statut de pause
          if (this.currentSession.status === 'break') {
            this.isOnBreak = true;
            this.breakStartTime = this.currentSession.lastBreakStart;
          }
          
          Logger.info('BadgingManager: Session actuelle chargée', { sessionId: this.currentSession.id }, 'BadgingManager');
        }
        
      } catch (indexError) {
        if (indexError.code === 'failed-precondition') {
          Logger.warn('BadgingManager: Index Firebase manquant, utilisation d\'une requête alternative', indexError, 'BadgingManager');
          
          // Fallback : récupérer toutes les sessions de l'utilisateur et filtrer côté client
          const simpleQuery = sessionsRef.where('userId', '==', this.currentUser.uid);
          const snapshot = await simpleQuery.get();
          
          const todaySessions = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(session => session.date === today)
            .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          
          if (todaySessions.length > 0) {
            this.currentSession = todaySessions[0];
            
            if (this.currentSession.status === 'break') {
              this.isOnBreak = true;
              this.breakStartTime = this.currentSession.lastBreakStart;
            }
            
            Logger.info('BadgingManager: Session chargée via requête alternative', { sessionId: this.currentSession.id }, 'BadgingManager');
          }
        } else {
          throw indexError;
        }
      }
      
    } catch (error) {
      Logger.error('BadgingManager: Erreur lors du chargement de la session', error, 'BadgingManager');
      // Ne pas faire échouer l'initialisation, juste logger l'erreur
    }
  }

  async checkIn(comment = '', isRemote = false) {
    if (!this.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    if (this.currentSession && this.currentSession.status === 'active') {
      throw new Error('Une session est déjà active');
    }

    try {
      const now = firebase.firestore.Timestamp.now();
      const today = new Date().toISOString().split('T')[0];

      const sessionData = {
        userId: this.currentUser.uid,
        userEmail: this.currentUser.email,
        date: today,
        checkInTime: now,
        checkInComment: comment,
        isRemoteWork: isRemote,
        status: 'active',
        breaks: [],
        totalBreakTime: 0,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firebase.firestore()
        .collection('timeclock_sessions')
        .add(sessionData);

      this.currentSession = {
        id: docRef.id,
        ...sessionData
      };

      this.isOnBreak = false;
      this.breakStartTime = null;

      Logger.info('BadgingManager: Check-in réussi', { 
        sessionId: this.currentSession.id,
        isRemote,
        comment 
      }, 'BadgingManager');

      // Déclencher un événement
      this.dispatchEvent('checkin', this.currentSession);

      return this.currentSession;

    } catch (error) {
      Logger.error('BadgingManager: Erreur lors du check-in', error, 'BadgingManager');
      throw error;
    }
  }

  async checkOut(comment = '') {
    if (!this.currentSession) {
      throw new Error('Aucune session active');
    }

    try {
      const now = firebase.firestore.Timestamp.now();

      // Si en pause, terminer la pause d'abord
      if (this.isOnBreak) {
        await this.endBreak();
      }

      // Calculer la durée totale de travail
      const checkInTime = this.currentSession.checkInTime.toDate();
      const totalWorkTime = Math.floor((now.toDate() - checkInTime) / 1000) - this.currentSession.totalBreakTime;

      const updateData = {
        checkOutTime: now,
        checkOutComment: comment,
        status: 'completed',
        totalWorkTime: totalWorkTime,
        updatedAt: now
      };

      await firebase.firestore()
        .collection('timeclock_sessions')
        .doc(this.currentSession.id)
        .update(updateData);

      // Mettre à jour l'objet local
      Object.assign(this.currentSession, updateData);

      Logger.info('BadgingManager: Check-out réussi', { 
        sessionId: this.currentSession.id,
        totalWorkTime: totalWorkTime,
        comment 
      }, 'BadgingManager');

      // Déclencher un événement
      this.dispatchEvent('checkout', this.currentSession);

      // Réinitialiser l'état
      const completedSession = { ...this.currentSession };
      this.currentSession = null;
      this.isOnBreak = false;
      this.breakStartTime = null;

      return completedSession;

    } catch (error) {
      Logger.error('BadgingManager: Erreur lors du check-out', error, 'BadgingManager');
      throw error;
    }
  }

  async startBreak(type = 'general') {
    if (!this.currentSession) {
      throw new Error('Aucune session active');
    }

    if (this.isOnBreak) {
      throw new Error('Une pause est déjà en cours');
    }

    try {
      const now = firebase.firestore.Timestamp.now();
      this.breakStartTime = now;
      this.isOnBreak = true;

      const updateData = {
        status: 'break',
        lastBreakStart: now,
        lastBreakType: type,
        updatedAt: now
      };

      await firebase.firestore()
        .collection('timeclock_sessions')
        .doc(this.currentSession.id)
        .update(updateData);

      // Mettre à jour l'objet local
      Object.assign(this.currentSession, updateData);

      Logger.info('BadgingManager: Pause démarrée', { 
        sessionId: this.currentSession.id,
        type 
      }, 'BadgingManager');

      // Déclencher un événement
      this.dispatchEvent('breakstart', { session: this.currentSession, type });

      return this.currentSession;

    } catch (error) {
      Logger.error('BadgingManager: Erreur lors du début de pause', error, 'BadgingManager');
      throw error;
    }
  }

  async endBreak() {
    if (!this.currentSession) {
      throw new Error('Aucune session active');
    }

    if (!this.isOnBreak) {
      throw new Error('Aucune pause en cours');
    }

    try {
      const now = firebase.firestore.Timestamp.now();
      const breakDuration = Math.floor((now.toDate() - this.breakStartTime.toDate()) / 1000);

      const breakRecord = {
        startTime: this.breakStartTime,
        endTime: now,
        duration: breakDuration,
        type: this.currentSession.lastBreakType || 'general'
      };

      const newBreaks = [...(this.currentSession.breaks || []), breakRecord];
      const newTotalBreakTime = (this.currentSession.totalBreakTime || 0) + breakDuration;

      const updateData = {
        status: 'active',
        breaks: newBreaks,
        totalBreakTime: newTotalBreakTime,
        lastBreakEnd: now,
        updatedAt: now
      };

      await firebase.firestore()
        .collection('timeclock_sessions')
        .doc(this.currentSession.id)
        .update(updateData);

      // Mettre à jour l'objet local
      Object.assign(this.currentSession, updateData);

      this.isOnBreak = false;
      this.breakStartTime = null;

      Logger.info('BadgingManager: Pause terminée', { 
        sessionId: this.currentSession.id,
        duration: breakDuration 
      }, 'BadgingManager');

      // Déclencher un événement
      this.dispatchEvent('breakend', { session: this.currentSession, duration: breakDuration });

      return this.currentSession;

    } catch (error) {
      Logger.error('BadgingManager: Erreur lors de la fin de pause', error, 'BadgingManager');
      throw error;
    }
  }

  // Méthodes utilitaires
  getCurrentSession() {
    return this.currentSession;
  }

  isUserCheckedIn() {
    return this.currentSession && this.currentSession.status !== 'completed';
  }

  isUserOnBreak() {
    return this.isOnBreak;
  }

  getCurrentWorkTime() {
    if (!this.currentSession || !this.currentSession.checkInTime) {
      return 0;
    }

    const now = new Date();
    const checkInTime = this.currentSession.checkInTime.toDate();
    const totalTime = Math.floor((now - checkInTime) / 1000);
    const breakTime = this.getCurrentBreakTime();
    
    return Math.max(0, totalTime - breakTime);
  }

  getCurrentBreakTime() {
    let totalBreakTime = this.currentSession?.totalBreakTime || 0;
    
    // Ajouter le temps de pause actuel si en pause
    if (this.isOnBreak && this.breakStartTime) {
      const currentBreakTime = Math.floor((new Date() - this.breakStartTime.toDate()) / 1000);
      totalBreakTime += currentBreakTime;
    }
    
    return totalBreakTime;
  }

  // Système d'événements simple
  addEventListener(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = new Map();
    }
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(callback);
  }

  removeEventListener(event, callback) {
    if (!this.eventListeners || !this.eventListeners.has(event)) {
      return;
    }
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  dispatchEvent(event, data) {
    if (!this.eventListeners || !this.eventListeners.has(event)) {
      return;
    }
    
    this.eventListeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        Logger.error('BadgingManager: Erreur dans le callback d\'événement', error, 'BadgingManager');
      }
    });
  }

  // Méthodes de requête
  async getSessionHistory(startDate, endDate, limit = 50) {
    if (!this.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      let query = firebase.firestore()
        .collection('timeclock_sessions')
        .where('userId', '==', this.currentUser.uid);

      if (startDate) {
        query = query.where('date', '>=', startDate);
      }
      
      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      // Essayer avec orderBy, fallback si l'index n'existe pas
      try {
        query = query.orderBy('createdAt', 'desc').limit(limit);
      } catch (error) {
        Logger.warn('BadgingManager: Impossible d\'ordonner les résultats, index manquant', error, 'BadgingManager');
      }

      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      Logger.error('BadgingManager: Erreur lors de la récupération de l\'historique', error, 'BadgingManager');
      throw error;
    }
  }

  // Nettoyage
  destroy() {
    try {
      this.currentSession = null;
      this.currentUser = null;
      this.isOnBreak = false;
      this.breakStartTime = null;
      this.initialized = false;
      
      if (this.eventListeners) {
        this.eventListeners.clear();
      }
      
      Logger.info('BadgingManager: Nettoyage terminé', null, 'BadgingManager');
    } catch (error) {
      Logger.error('BadgingManager: Erreur lors du nettoyage', error, 'BadgingManager');
    }
  }
}

// Exporter la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BadgingManager;
} else if (typeof window !== 'undefined') {
  window.BadgingManager = BadgingManager;
}

Logger.debug('BadgingManager: Classe chargée', null, 'BadgingManager');
