/* 
 * BadgingManager.js
 * Système de pointage entrée/sortie - Phase 4 SYNERGIA v3.0
 * 
 * Fonctionnalités :
 * - Pointage arrivée/sortie
 * - Gestion des pauses
 * - Calcul automatique des heures
 * - Historique des pointages
 * - Horloge temps réel
 */

class BadgingManager {
    constructor() {
        this.firestore = null;
        this.currentTimesheet = null;
        this.timesheets = [];
        this.isInitialized = false;
        this.clockInterval = null;
        this.init();
    }

    async init() {
        try {
            console.log('⏰ Initialisation BadgingManager...');
            await this.waitForFirebase();
            this.firestore = window.firebaseService.getFirestore();
            this.isInitialized = true;
            
            // Charger la feuille de temps du jour
            await this.loadTodaysTimesheet();
            
            console.log('✅ BadgingManager initialisé');
        } catch (error) {
            console.error('❌ Erreur BadgingManager:', error);
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.firebaseService && window.firebaseService.isInitialized) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // ==================
    // GESTION DE L'HORLOGE
    // ==================
    startClock() {
        this.updateClock();
        this.clockInterval = setInterval(() => {
            this.updateClock();
        }, 1000);
    }

    stopClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
    }

    updateClock() {
        const now = new Date();
        const timeElement = document.getElementById('currentTime');
        const dateElement = document.getElementById('currentDate');
        
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('fr-FR');
        }
        
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    // ==================
    // GESTION DES TIMESHEETS
    // ==================
    async loadTodaysTimesheet() {
        try {
            const user = window.authManager.getCurrentUser();
            if (!user) return;

            const today = this.getDateString(new Date());
            
            const snapshot = await this.firestore.collection('timesheets')
                .where('userId', '==', user.uid)
                .where('date', '==', today)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                this.currentTimesheet = { 
                    id: doc.id, 
                    ...doc.data(),
                    checkIn: doc.data().checkIn?.toDate(),
                    checkOut: doc.data().checkOut?.toDate(),
                    breakStart: doc.data().breakStart?.toDate(),
                    breakEnd: doc.data().breakEnd?.toDate()
                };
            } else {
                this.currentTimesheet = null;
            }
            
            this.emit('timesheet:loaded', this.currentTimesheet);
            console.log('✅ Feuille de temps du jour chargée');
        } catch (error) {
            console.error('❌ Erreur chargement timesheet:', error);
        }
    }

    async loadTimesheets(userId = null, startDate = null, endDate = null) {
        try {
            const user = window.authManager.getCurrentUser();
            const targetUserId = userId || user?.uid;
            
            if (!targetUserId) throw new Error('Utilisateur non spécifié');

            let query = this.firestore.collection('timesheets')
                .where('userId', '==', targetUserId);

            if (startDate) {
                query = query.where('date', '>=', this.getDateString(startDate));
            }
            
            if (endDate) {
                query = query.where('date', '<=', this.getDateString(endDate));
            }

            const snapshot = await query.orderBy('date', 'desc').limit(30).get();
            
            this.timesheets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                checkIn: doc.data().checkIn?.toDate(),
                checkOut: doc.data().checkOut?.toDate(),
                breakStart: doc.data().breakStart?.toDate(),
                breakEnd: doc.data().breakEnd?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate()
            }));
            
            console.log(`✅ ${this.timesheets.length} feuilles de temps chargées`);
            this.emit('timesheets:loaded', this.timesheets);
            
            return this.timesheets;
        } catch (error) {
            console.error('❌ Erreur chargement timesheets:', error);
            throw error;
        }
    }

    // ==================
    // ACTIONS DE POINTAGE
    // ==================
    async checkIn(note = '') {
        try {
            const user = window.authManager.getCurrentUser();
            if (!user) throw new Error('Utilisateur non connecté');

            if (this.currentTimesheet && this.currentTimesheet.checkIn) {
                throw new Error('Vous avez déjà pointé votre arrivée aujourd\'hui');
            }

            const now = new Date();
            const today = this.getDateString(now);
            
            const timesheetData = {
                userId: user.uid,
                date: today,
                checkIn: firebase.firestore.Timestamp.fromDate(now),
                checkOut: null,
                breakStart: null,
                breakEnd: null,
                totalHours: 0,
                status: this.calculateStatus(now),
                notes: note,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (this.currentTimesheet) {
                // Mettre à jour existant
                await this.firestore.collection('timesheets')
                    .doc(this.currentTimesheet.id)
                    .update({
                        checkIn: timesheetData.checkIn,
                        status: timesheetData.status,
                        notes: note,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                this.currentTimesheet.checkIn = now;
                this.currentTimesheet.status = timesheetData.status;
                this.currentTimesheet.notes = note;
            } else {
                // Créer nouveau
                const docRef = await this.firestore.collection('timesheets').add(timesheetData);
                this.currentTimesheet = {
                    id: docRef.id,
                    ...timesheetData,
                    checkIn: now,
                    createdAt: now,
                    updatedAt: now
                };
            }

            console.log('✅ Pointage d\'arrivée enregistré');
            this.emit('badge:checkin', this.currentTimesheet);
            
            return this.currentTimesheet;
        } catch (error) {
            console.error('❌ Erreur check-in:', error);
            throw error;
        }
    }

    async checkOut(note = '') {
        try {
            const user = window.authManager.getCurrentUser();
            if (!user) throw new Error('Utilisateur non connecté');

            if (!this.currentTimesheet || !this.currentTimesheet.checkIn) {
                throw new Error('Vous devez d\'abord pointer votre arrivée');
            }

            if (this.currentTimesheet.checkOut) {
                throw new Error('Vous avez déjà pointé votre sortie aujourd\'hui');
            }

            const now = new Date();
            const totalHours = this.calculateTotalHours(this.currentTimesheet.checkIn, now);
            
            const updateData = {
                checkOut: firebase.firestore.Timestamp.fromDate(now),
                totalHours: totalHours,
                notes: note || this.currentTimesheet.notes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.firestore.collection('timesheets')
                .doc(this.currentTimesheet.id)
                .update(updateData);
            
            this.currentTimesheet.checkOut = now;
            this.currentTimesheet.totalHours = totalHours;
            this.currentTimesheet.notes = note || this.currentTimesheet.notes;

            console.log('✅ Pointage de sortie enregistré');
            this.emit('badge:checkout', this.currentTimesheet);
            
            return this.currentTimesheet;
        } catch (error) {
            console.error('❌ Erreur check-out:', error);
            throw error;
        }
    }

    async startBreak(note = '') {
        try {
            if (!this.currentTimesheet || !this.currentTimesheet.checkIn) {
                throw new Error('Vous devez d\'abord pointer votre arrivée');
            }

            if (this.currentTimesheet.breakStart && !this.currentTimesheet.breakEnd) {
                throw new Error('Vous êtes déjà en pause');
            }

            const now = new Date();
            
            await this.firestore.collection('timesheets')
                .doc(this.currentTimesheet.id)
                .update({
                    breakStart: firebase.firestore.Timestamp.fromDate(now),
                    breakEnd: null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            this.currentTimesheet.breakStart = now;
            this.currentTimesheet.breakEnd = null;

            console.log('✅ Début de pause enregistré');
            this.emit('badge:breakstart', this.currentTimesheet);
            
            return this.currentTimesheet;
        } catch (error) {
            console.error('❌ Erreur début pause:', error);
            throw error;
        }
    }

    async endBreak(note = '') {
        try {
            if (!this.currentTimesheet || !this.currentTimesheet.breakStart) {
                throw new Error('Vous devez d\'abord commencer une pause');
            }

            if (this.currentTimesheet.breakEnd) {
                throw new Error('Vous avez déjà terminé votre pause');
            }

            const now = new Date();
            
            await this.firestore.collection('timesheets')
                .doc(this.currentTimesheet.id)
                .update({
                    breakEnd: firebase.firestore.Timestamp.fromDate(now),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            this.currentTimesheet.breakEnd = now;

            console.log('✅ Fin de pause enregistrée');
            this.emit('badge:breakend', this.currentTimesheet);
            
            return this.currentTimesheet;
        } catch (error) {
            console.error('❌ Erreur fin pause:', error);
            throw error;
        }
    }

    // ==================
    // CALCULS ET UTILITAIRES
    // ==================
    calculateStatus(checkInTime) {
        const hour = checkInTime.getHours();
        const minute = checkInTime.getMinutes();
        
        // Considérer 9h00 comme l'heure normale
        if (hour < 9 || (hour === 9 && minute === 0)) {
            return 'present';
        } else if (hour === 9 && minute <= 15) {
            return 'present'; // Tolérance de 15 minutes
        } else {
            return 'late';
        }
    }

    calculateTotalHours(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;
        
        const diffMs = checkOut.getTime() - checkIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        return Math.round(diffHours * 100) / 100; // Arrondir à 2 décimales
    }

    getCurrentStatus() {
        if (!this.currentTimesheet) return 'not-started';
        
        if (this.currentTimesheet.checkOut) return 'finished';
        if (this.currentTimesheet.breakStart && !this.currentTimesheet.breakEnd) return 'on-break';
        if (this.currentTimesheet.checkIn) return 'working';
        
        return 'not-started';
    }

    getTodaysStats() {
        if (!this.currentTimesheet) {
            return {
                checkIn: null,
                checkOut: null,
                totalHours: 0,
                status: 'not-started',
                breakDuration: 0
            };
        }

        let breakDuration = 0;
        if (this.currentTimesheet.breakStart && this.currentTimesheet.breakEnd) {
            breakDuration = (this.currentTimesheet.breakEnd.getTime() - this.currentTimesheet.breakStart.getTime()) / (1000 * 60);
        }

        return {
            checkIn: this.currentTimesheet.checkIn,
            checkOut: this.currentTimesheet.checkOut,
            totalHours: this.currentTimesheet.totalHours || 0,
            status: this.currentTimesheet.status || 'present',
            breakDuration: Math.round(breakDuration)
        };
    }

    getDateString(date) {
        return date.toISOString().split('T')[0];
    }

    // ==================
    // GETTERS
    // ==================
    getCurrentTimesheet() { return this.currentTimesheet; }
    getTimesheets() { return [...this.timesheets]; }

    // ==================
    // EVENTS
    // ==================
    emit(eventName, data) {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
}

// Export pour réutilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgingManager;
} else {
    window.BadgingManager = BadgingManager;
}
