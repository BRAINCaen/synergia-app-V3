// js/modules/badging/badging-manager.js
// Gestionnaire de pointage avancé inspiré de Skello

class BadgingManager {
    constructor() {
        this.currentSession = null;
        this.sessions = new Map();
        this.events = new Map();
        this.unsubscribers = [];
        this.geolocationWatchId = null;
        this.isReady = false;
        this.init();
    }

    async init() {
        await window.firebaseManager.waitForReady();
        
        // Charger la session active si elle existe
        await this.loadCurrentSession();
        
        // Écouter les changements
        this.subscribeToUpdates();
        
        // Configurer la géolocalisation si disponible
        this.setupGeolocation();
        
        this.isReady = true;
        console.log('✅ BadgingManager initialisé');
    }

    // Charger la session active
    async loadCurrentSession() {
        const userId = window.firebaseManager.currentUser?.uid;
        if (!userId) return;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const snapshot = await window.firebaseManager.collection('badgingSessions')
            .where('employeeId', '==', userId)
            .where('date', '>=', firebase.firestore.Timestamp.fromDate(today))
            .where('status', 'in', ['open', 'break'])
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            this.currentSession = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }
    }

    // S'abonner aux mises à jour
    subscribeToUpdates() {
        const userId = window.firebaseManager.currentUser?.uid;
        if (!userId) return;
        
        // Écouter les sessions de l'utilisateur
        const unsubscribe = window.firebaseManager.collection('badgingSessions')
            .where('employeeId', '==', userId)
            .orderBy('date', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const session = { id: change.doc.id, ...change.doc.data() };
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        this.sessions.set(session.id, session);
                        
                        // Mettre à jour la session courante si c'est elle
                        if (this.currentSession?.id === session.id) {
                            this.currentSession = session;
                        }
                        
                        this.notifyUpdate('session:updated', session);
                    } else if (change.type === 'removed') {
                        this.sessions.delete(session.id);
                        
                        if (this.currentSession?.id === session.id) {
                            this.currentSession = null;
                        }
                        
                        this.notifyUpdate('session:removed', session);
                    }
                });
                
                this.notifyUpdate('sessions:updated', this.getSessions());
            });
        
        this.unsubscribers.push(unsubscribe);
    }

    // Configuration de la géolocalisation
    setupGeolocation() {
        if ('geolocation' in navigator) {
            // Options de géolocalisation
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            
            // Surveiller la position
            this.geolocationWatchId = navigator.geolocation.watchPosition(
                (position) => {
                    this.lastKnownPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                },
                (error) => {
                    console.warn('Géolocalisation non disponible:', error);
                },
                options
            );
        }
    }

    // Pointer l'arrivée (Clock In)
    async clockIn(options = {}) {
        try {
            const userId = window.firebaseManager.currentUser?.uid;
            if (!userId) throw new Error('Utilisateur non connecté');
            
            // Vérifier qu'il n'y a pas déjà une session active
            if (this.currentSession) {
                throw new Error('Une session est déjà active');
            }
            
            // Récupérer le shift prévu si disponible
            const shift = await this.getTodayShift(userId);
            
            // Vérifier la position si configurée
            let location = null;
            if (options.requireLocation && this.lastKnownPosition) {
                const isValid = await this.validateLocation(this.lastKnownPosition);
                if (!isValid && !options.forceClockIn) {
                    throw new Error('Position en dehors de la zone autorisée');
                }
                location = this.lastKnownPosition;
            }
            
            // Créer la session
            const sessionData = {
                employeeId: userId,
                date: firebase.firestore.Timestamp.fromDate(new Date()),
                status: 'open',
                shiftId: shift?.id || null,
                plannedStart: shift?.startTime || null,
                plannedEnd: shift?.endTime || null,
                events: [],
                totalHours: 0,
                breakTime: 0,
                workTime: 0,
                overtime: 0,
                deviceInfo: this.getDeviceInfo(),
                createdAt: window.firebaseManager.timestamp()
            };
            
            const sessionRef = await window.firebaseManager.collection('badgingSessions').add(sessionData);
            sessionData.id = sessionRef.id;
            
            // Créer l'événement de pointage
            const eventData = {
                sessionId: sessionRef.id,
                employeeId: userId,
                type: 'clock_in',
                timestamp: window.firebaseManager.timestamp(),
                location: location,
                deviceId: this.getDeviceId(),
                verificationMethod: options.verificationMethod || 'manual',
                comment: options.comment || null
            };
            
            await window.firebaseManager.collection('badgingEvents').add(eventData);
            
            // Mettre à jour l'état
            this.currentSession = sessionData;
            
            // Notification
            this.showNotification('Pointage d\'arrivée enregistré', 'success');
            
            // Analytics
            this.logAnalytics('clock_in', {
                sessionId: sessionRef.id,
                hasShift: !!shift,
                method: options.verificationMethod
            });
            
            return sessionData;
        } catch (error) {
            console.error('❌ Erreur clock in:', error);
            throw error;
        }
    }

    // Pointer le départ (Clock Out)
    async clockOut(options = {}) {
        try {
            if (!this.currentSession) {
                throw new Error('Aucune session active');
            }
            
            // Vérifier qu'on n'est pas en pause
            if (this.currentSession.status === 'break') {
                throw new Error('Veuillez d\'abord terminer votre pause');
            }
            
            // Créer l'événement de pointage
            const eventData = {
                sessionId: this.currentSession.id,
                employeeId: this.currentSession.employeeId,
                type: 'clock_out',
                timestamp: window.firebaseManager.timestamp(),
                location: this.lastKnownPosition,
                deviceId: this.getDeviceId(),
                verificationMethod: options.verificationMethod || 'manual',
                comment: options.comment || null
            };
            
            await window.firebaseManager.collection('badgingEvents').add(eventData);
            
            // Calculer les heures travaillées
            const sessionStats = await this.calculateSessionStats(this.currentSession.id);
            
            // Mettre à jour la session
            await window.firebaseManager.collection('badgingSessions').doc(this.currentSession.id).update({
                status: 'closed',
                closedAt: window.firebaseManager.timestamp(),
                ...sessionStats
            });
            
            // Notification
            this.showNotification(
                `Pointage de départ enregistré. Temps travaillé: ${this.formatDuration(sessionStats.workTime)}`, 
                'success'
            );
            
            // Réinitialiser l'état
            this.currentSession = null;
            
            // Analytics
            this.logAnalytics('clock_out', {
                sessionId: this.currentSession.id,
                totalHours: sessionStats.totalHours,
                overtime: sessionStats.overtime
            });
            
            return true;
        } catch (error) {
            console.error('❌ Erreur clock out:', error);
            throw error;
        }
    }

    // Commencer une pause
    async startBreak(breakType = 'short', options = {}) {
        try {
            if (!this.currentSession) {
                throw new Error('Aucune session active');
            }
            
            if (this.currentSession.status === 'break') {
                throw new Error('Une pause est déjà en cours');
            }
            
            // Créer l'événement de pause
            const eventData = {
                sessionId: this.currentSession.id,
                employeeId: this.currentSession.employeeId,
                type: 'break_start',
                timestamp: window.firebaseManager.timestamp(),
                location: this.lastKnownPosition,
                deviceId: this.getDeviceId(),
                breakType: breakType, // 'lunch', 'short', 'personal', 'meeting'
                comment: options.comment || null
            };
            
            await window.firebaseManager.collection('badgingEvents').add(eventData);
            
            // Mettre à jour la session
            await window.firebaseManager.collection('badgingSessions').doc(this.currentSession.id).update({
                status: 'break',
                currentBreakType: breakType,
                currentBreakStart: window.firebaseManager.timestamp()
            });
            
            // Mettre à jour l'état local
            this.currentSession.status = 'break';
            this.currentSession.currentBreakType = breakType;
            
            // Notification
            this.showNotification('Pause commencée', 'info');
            
            return true;
        } catch (error) {
            console.error('❌ Erreur début pause:', error);
            throw error;
        }
    }

    // Terminer une pause
    async endBreak(options = {}) {
        try {
            if (!this.currentSession) {
                throw new Error('Aucune session active');
            }
            
            if (this.currentSession.status !== 'break') {
                throw new Error('Aucune pause en cours');
            }
            
            // Créer l'événement de fin de pause
            const eventData = {
                sessionId: this.currentSession.id,
                employeeId: this.currentSession.employeeId,
                type: 'break_end',
                timestamp: window.firebaseManager.timestamp(),
                location: this.lastKnownPosition,
                deviceId: this.getDeviceId(),
                breakType: this.currentSession.currentBreakType,
                comment: options.comment || null
            };
            
            await window.firebaseManager.collection('badgingEvents').add(eventData);
            
            // Mettre à jour la session
            await window.firebaseManager.collection('badgingSessions').doc(this.currentSession.id).update({
                status: 'open',
                currentBreakType: null,
                currentBreakStart: null
            });
            
            // Mettre à jour l'état local
            this.currentSession.status = 'open';
            this.currentSession.currentBreakType = null;
            
            