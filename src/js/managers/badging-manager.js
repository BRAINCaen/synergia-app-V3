/**
 * BadgingManager - Gestionnaire de pointage simple pour SYNERGIA v3.0
 * Fichier: src/js/managers/BadgingManager.js
 */

import firebaseService from '../core/firebase-service.js';
import Logger from '../core/logger.js';

export class BadgingManager {
    constructor() {
        this.currentTimesheet = null;
        this.clockInterval = null;
        this.isInitialized = false;
        this.status = 'not-started'; // not-started, working, on-break, finished
    }

    async initialize() {
        try {
            this.isInitialized = true;
            Logger.info('BadgingManager initialized');
        } catch (error) {
            Logger.error('Error initializing BadgingManager:', error);
            throw error;
        }
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
    // ACTIONS DE POINTAGE
    // ==================

    async checkIn() {
        try {
            const user = firebaseService.getCurrentUser();
            if (!user) throw new Error('Utilisateur non connecté');

            if (this.currentTimesheet && !this.currentTimesheet.checkOut) {
                throw new Error('Vous êtes déjà pointé');
            }

            const now = new Date();
            const timesheetData = {
                userId: user.uid,
                date: now.toISOString().split('T')[0],
                checkIn: now.toISOString(),
                checkOut: null,
                breaks: [],
                totalHours: 0,
                status: 'working',
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            const timesheetRef = await firebaseService.addDocument('timesheets', timesheetData);
            this.currentTimesheet = { id: timesheetRef.id, ...timesheetData };
            this.status = 'working';

            this.emitEvent('badge:checkin', this.currentTimesheet);
            Logger.info('Check-in successful');

            return this.currentTimesheet;

        } catch (error) {
            Logger.error('Check-in error:', error);
            throw error;
        }
    }

    async checkOut() {
        try {
            if (!this.currentTimesheet || this.currentTimesheet.checkOut) {
                throw new Error('Aucun pointage d\'arrivée trouvé');
            }

            const now = new Date();
            const checkInTime = new Date(this.currentTimesheet.checkIn);
            const totalHours = (now - checkInTime) / (1000 * 60 * 60); // en heures

            const updateData = {
                checkOut: now.toISOString(),
                totalHours: totalHours,
                status: 'finished',
                updatedAt: now.toISOString()
            };

            await firebaseService.updateDocument('timesheets', this.currentTimesheet.id, updateData);
            Object.assign(this.currentTimesheet, updateData);
            this.status = 'finished';

            this.emitEvent('badge:checkout', this.currentTimesheet);
            Logger.info('Check-out successful');

            return this.currentTimesheet;

        } catch (error) {
            Logger.error('Check-out error:', error);
            throw error;
        }
    }

    async startBreak() {
        try {
            if (!this.currentTimesheet || this.currentTimesheet.checkOut) {
                throw new Error('Aucune session active');
            }

            const now = new Date();
            const breakData = {
                startTime: now.toISOString(),
                endTime: null
            };

            this.currentTimesheet.breaks = this.currentTimesheet.breaks || [];
            this.currentTimesheet.breaks.push(breakData);
            this.status = 'on-break';

            await firebaseService.updateDocument('timesheets', this.currentTimesheet.id, {
                breaks: this.currentTimesheet.breaks,
                status: 'on-break',
                updatedAt: now.toISOString()
            });

            this.emitEvent('badge:breakstart', breakData);
            Logger.info('Break started');

            return breakData;

        } catch (error) {
            Logger.error('Start break error:', error);
            throw error;
        }
    }

    async endBreak() {
        try {
            if (!this.currentTimesheet || this.status !== 'on-break') {
                throw new Error('Aucune pause en cours');
            }

            const now = new Date();
            const currentBreak = this.currentTimesheet.breaks[this.currentTimesheet.breaks.length - 1];
            
            if (currentBreak && !currentBreak.endTime) {
                currentBreak.endTime = now.toISOString();
                this.status = 'working';

                await firebaseService.updateDocument('timesheets', this.currentTimesheet.id, {
                    breaks: this.currentTimesheet.breaks,
                    status: 'working',
                    updatedAt: now.toISOString()
                });

                this.emitEvent('badge:breakend', currentBreak);
                Logger.info('Break ended');

                return currentBreak;
            }

        } catch (error) {
            Logger.error('End break error:', error);
            throw error;
        }
    }

    // ==================
    // DONNÉES ET STATISTIQUES
    // ==================

    async loadTodaysTimesheet() {
        try {
            const user = firebaseService.getCurrentUser();
            if (!user) return null;

            const today = new Date().toISOString().split('T')[0];
            const timesheets = await firebaseService.queryDocuments('timesheets', [
                ['userId', '==', user.uid],
                ['date', '==', today]
            ]);

            if (timesheets.length > 0) {
                this.currentTimesheet = timesheets[0];
                this.updateStatus();
            }

            return this.currentTimesheet;

        } catch (error) {
            Logger.error('Error loading today\'s timesheet:', error);
            return null;
        }
    }

    updateStatus() {
        if (!this.currentTimesheet) {
            this.status = 'not-started';
        } else if (this.currentTimesheet.checkOut) {
            this.status = 'finished';
        } else if (this.isCurrentlyOnBreak()) {
            this.status = 'on-break';
        } else {
            this.status = 'working';
        }
    }

    isCurrentlyOnBreak() {
        if (!this.currentTimesheet || !this.currentTimesheet.breaks) {
            return false;
        }

        const lastBreak = this.currentTimesheet.breaks[this.currentTimesheet.breaks.length - 1];
        return lastBreak && lastBreak.startTime && !lastBreak.endTime;
    }

    getTodaysStats() {
        if (!this.currentTimesheet) {
            return {
                checkIn: null,
                checkOut: null,
                totalHours: 0,
                breakDuration: 0
            };
        }

        const stats = {
            checkIn: this.currentTimesheet.checkIn,
            checkOut: this.currentTimesheet.checkOut,
            totalHours: this.currentTimesheet.totalHours || 0,
            breakDuration: this.calculateBreakDuration()
        };

        return stats;
    }

    calculateBreakDuration() {
        if (!this.currentTimesheet || !this.currentTimesheet.breaks) {
            return 0;
        }

        return this.currentTimesheet.breaks.reduce((total, breakItem) => {
            if (breakItem.startTime && breakItem.endTime) {
                const start = new Date(breakItem.startTime);
                const end = new Date(breakItem.endTime);
                return total + (end - start) / (1000 * 60); // en minutes
            }
            return total;
        }, 0);
    }

    getCurrentStatus() {
        return this.status;
    }

    async getWeeklyStats() {
        try {
            const user = firebaseService.getCurrentUser();
            if (!user) return null;

            const now = new Date();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));

            const timesheets = await firebaseService.queryDocuments('timesheets', [
                ['userId', '==', user.uid],
                ['date', '>=', startOfWeek.toISOString().split('T')[0]],
                ['date', '<=', endOfWeek.toISOString().split('T')[0]]
            ]);

            const totalHours = timesheets.reduce((sum, sheet) => sum + (sheet.totalHours || 0), 0);
            const daysWorked = timesheets.filter(sheet => sheet.checkIn).length;

            return {
                totalHours,
                daysWorked,
                timesheets
            };

        } catch (error) {
            Logger.error('Error getting weekly stats:', error);
            return null;
        }
    }

    // ==================
    // ÉVÉNEMENTS
    // ==================

    emitEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    // ==================
    // NETTOYAGE
    // ==================

    destroy() {
        this.stopClock();
        this.currentTimesheet = null;
        this.isInitialized = false;
        Logger.info('BadgingManager destroyed');
    }
}

export default BadgingManager;
