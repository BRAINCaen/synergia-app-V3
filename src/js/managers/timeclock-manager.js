// src/js/managers/TimeClockManager.js
import { EventBus } from '../core/eventbus.js';
import { FirebaseService } from '../core/firebase-service.js';
import { Logger } from '../core/logger.js';

export class TimeClockManager {
    constructor() {
        this.currentSession = null;
        this.timeEntries = [];
        this.isOnBreak = false;
        this.currentBreakStart = null;
        this.breaks = [];
        this.initialize();
    }

    async initialize() {
        try {
            await this.loadCurrentSession();
            await this.loadTimeEntries();
            this.setupEventListeners();
            Logger.info('TimeClockManager initialized');
        } catch (error) {
            Logger.error('Error initializing TimeClockManager:', error);
        }
    }

    setupEventListeners() {
        EventBus.on('auth:userChanged', () => {
            this.loadCurrentSession();
            this.loadTimeEntries();
        });

        EventBus.on('planning:reminder', (data) => {
            this.handlePlanningReminder(data);
        });
    }

    // Pointage d'arrivée
    async clockIn(comment = '', isRemote = false, location = null) {
        try {
            const user = FirebaseService.getCurrentUser();
            if (!user) throw new Error('Utilisateur non connecté');

            if (this.currentSession && !this.currentSession.clockOut) {
                throw new Error('Une session est déjà en cours');
            }

            const now = new Date();
            const sessionData = {
                userId: user.uid,
                clockIn: now.toISOString(),
                clockInComment: comment,
                isRemote: isRemote,
                location: location,
                breaks: [],
                clockOut: null,
                clockOutComment: null,
                totalWorkTime: 0,
                totalBreakTime: 0,
                isTraining: false,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            const sessionRef = await FirebaseService.addDocument('timeclock_sessions', sessionData);
            this.currentSession = { id: sessionRef.id, ...sessionData };
            
            // Vérifier les retards par rapport au planning
            await this.checkForLateArrival(now);

            EventBus.emit('timeclock:clockedIn', this.currentSession);
            Logger.info('Clock in successful', this.currentSession);
            
            return this.currentSession;
        } catch (error) {
            Logger.error('Error clocking in:', error);
            throw error;
        }
    }

    // Pointage de sortie
    async clockOut(comment = '') {
        try {
            if (!this.currentSession || this.currentSession.clockOut) {
                throw new Error('Aucune session active à terminer');
            }

            // Terminer la pause en cours si nécessaire
            if (this.isOnBreak) {
                await this.endBreak();
            }

            const now = new Date();
            const clockInTime = new Date(this.currentSession.clockIn);
            const totalWorkTime = this.calculateWorkTime(clockInTime, now, this.currentSession.breaks);

            const updateData = {
                clockOut: now.toISOString(),
                clockOutComment: comment,
                totalWorkTime: totalWorkTime,
                totalBreakTime: this.calculateTotalBreakTime(this.currentSession.breaks),
                updatedAt: now.toISOString()
            };

            await FirebaseService.updateDocument('timeclock_sessions', this.currentSession.id, updateData);
            
            Object.assign(this.currentSession, updateData);
            
            EventBus.emit('timeclock:clockedOut', this.currentSession);
            Logger.info('Clock out successful', this.currentSession);

            // Reset current session
            this.currentSession = null;
            this.isOnBreak = false;
            this.currentBreakStart = null;

            return updateData;
        } catch (error) {
            Logger.error('Error clocking out:', error);
            throw error;
        }
    }

    // Démarrer une pause
    async startBreak(reason = '') {
        try {
            if (!this.currentSession || this.currentSession.clockOut) {
                throw new Error('Aucune session active');
            }

            if (this.isOnBreak) {
                throw new Error('Une pause est déjà en cours');
            }

            const now = new Date();
            const breakData = {
                startTime: now.toISOString(),
                endTime: null,
                reason: reason,
                duration: 0
            };

            this.currentSession.breaks.push(breakData);
            this.currentBreakStart = now;
            this.isOnBreak = true;

            await FirebaseService.updateDocument('timeclock_sessions', this.currentSession.id, {
                breaks: this.currentSession.breaks,
                updatedAt: now.toISOString()
            });

            EventBus.emit('timeclock:breakStarted', breakData);
            Logger.info('Break started', breakData);

            return breakData;
        } catch (error) {
            Logger.error('Error starting break:', error);
            throw error;
        }
    }

    // Terminer une pause
    async endBreak() {
        try {
            if (!this.isOnBreak || !this.currentBreakStart) {
                throw new Error('Aucune pause en cours');
            }

            const now = new Date();
            const currentBreak = this.currentSession.breaks[this.currentSession.breaks.length - 1];
            const duration = now.getTime() - this.currentBreakStart.getTime();

            currentBreak.endTime = now.toISOString();
            currentBreak.duration = Math.floor(duration / 1000 / 60); // en minutes

            await FirebaseService.updateDocument('timeclock_sessions', this.currentSession.id, {
                breaks: this.currentSession.breaks,
                updatedAt: now.toISOString()
            });

            this.isOnBreak = false;
            this.currentBreakStart = null;

            EventBus.emit('timeclock:breakEnded', currentBreak);
            Logger.info('Break ended', currentBreak);

            return currentBreak;
        } catch (error) {
            Logger.error('Error ending break:', error);
            throw error;
        }
    }

    // Pointage formation (alternants)
    async clockTraining(comment = '') {
        try {
            const user = FirebaseService.getCurrentUser();
            if (!user) throw new Error('Utilisateur non connecté');

            const now = new Date();
            const trainingData = {
                userId: user.uid,
                clockIn: now.toISOString(),
                clockInComment: comment,
                isRemote: false,
                location: 'Formation',
                breaks: [],
                clockOut: new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString(), // +7h
                clockOutComment: 'Fin de formation automatique',
                totalWorkTime: 7 * 60, // 7h en minutes
                totalBreakTime: 0,
                isTraining: true,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            const sessionRef = await FirebaseService.addDocument('timeclock_sessions', trainingData);
            
            EventBus.emit('timeclock:trainingClocked', { id: sessionRef.id, ...trainingData });
            Logger.info('Training day clocked', trainingData);

            return { id: sessionRef.id, ...trainingData };
        } catch (error) {
            Logger.error('Error clocking training:', error);
            throw error;
        }
    }

    // Charger la session courante
    async loadCurrentSession() {
        try {
            const user = FirebaseService.getCurrentUser();
            if (!user) return;

            const sessions = await FirebaseService.queryDocuments('timeclock_sessions', [
                ['userId', '==', user.uid],
                ['clockOut', '==', null]
            ]);

            if (sessions.length > 0) {
                this.currentSession = sessions[0];
                
                // Vérifier si une pause est en cours
                const lastBreak = this.currentSession.breaks[this.currentSession.breaks.length - 1];
                if (lastBreak && !lastBreak.endTime) {
                    this.isOnBreak = true;
                    this.currentBreakStart = new Date(lastBreak.startTime);
                }
            }
        } catch (error) {
            Logger.error('Error loading current session:', error);
        }
    }

    // Charger l'historique des pointages
    async loadTimeEntries(startDate = null, endDate = null) {
        try {
            const user = FirebaseService.getCurrentUser();
            if (!user) return [];

            let query = [['userId', '==', user.uid]];
            
            if (startDate) {
                query.push(['createdAt', '>=', startDate.toISOString()]);
            }
            if (endDate) {
                query.push(['createdAt', '<=', endDate.toISOString()]);
            }

            this.timeEntries = await FirebaseService.queryDocuments('timeclock_sessions', query, [['createdAt', 'desc']]);
            
            EventBus.emit('timeclock:entriesLoaded', this.timeEntries);
            return this.timeEntries;
        } catch (error) {
            Logger.error('Error loading time entries:', error);
            return [];
        }
    }

    // Calculer le temps de travail
    calculateWorkTime(clockIn, clockOut, breaks = []) {
        const totalTime = clockOut.getTime() - clockIn.getTime();
        const breakTime = breaks.reduce((total, breakItem) => {
            if (breakItem.endTime) {
                return total + (new Date(breakItem.endTime).getTime() - new Date(breakItem.startTime).getTime());
            }
            return total;
        }, 0);
        
        return Math.floor((totalTime - breakTime) / 1000 / 60); // en minutes
    }

    // Calculer le temps total de pause
    calculateTotalBreakTime(breaks = []) {
        return breaks.reduce((total, breakItem) => {
            return total + (breakItem.duration || 0);
        }, 0);
    }

    // Calculer les statistiques
    calculateStats(entries = this.timeEntries) {
        const stats = {
            totalWorkTime: 0,
            totalBreakTime: 0,
            totalOvertime: 0,
            totalLateTime: 0,
            daysWorked: entries.length,
            trainingDays: 0
        };

        entries.forEach(entry => {
            if (entry.isTraining) {
                stats.trainingDays++;
            }
            
            stats.totalWorkTime += entry.totalWorkTime || 0;
            stats.totalBreakTime += entry.totalBreakTime || 0;
            
            // Calculer les heures sup (> 8h/jour)
            const dailyWork = entry.totalWorkTime || 0;
            if (dailyWork > 8 * 60) {
                stats.totalOvertime += dailyWork - (8 * 60);
            }
        });

        return stats;
    }

    // Vérifier les retards
    async checkForLateArrival(clockInTime) {
        try {
            // Récupérer le planning du jour
            const planningEntry = await this.getPlanningForDate(clockInTime);
            
            if (planningEntry && planningEntry.startTime) {
                const expectedStart = new Date(planningEntry.startTime);
                const actualStart = new Date(clockInTime);
                
                if (actualStart > expectedStart) {
                    const lateMinutes = Math.floor((actualStart - expectedStart) / 1000 / 60);
                    
                    EventBus.emit('timeclock:lateArrival', {
                        lateMinutes: lateMinutes,
                        expectedTime: expectedStart,
                        actualTime: actualStart
                    });
                }
            }
        } catch (error) {
            Logger.error('Error checking for late arrival:', error);
        }
    }

    // Gérer les rappels du planning
    handlePlanningReminder(data) {
        if (data.type === 'clockout_reminder' && this.currentSession && !this.currentSession.clockOut) {
            EventBus.emit('notification:show', {
                title: 'Rappel de dépointage',
                message: 'N\'oubliez pas de dépointer à la fin de votre journée',
                type: 'warning'
            });
        }
    }

    // Récupérer le planning pour une date
    async getPlanningForDate(date) {
        try {
            const user = FirebaseService.getCurrentUser();
            if (!user) return null;

            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const planningEntries = await FirebaseService.queryDocuments('planning', [
                ['userId', '==', user.uid],
                ['date', '>=', startOfDay.toISOString()],
                ['date', '<=', endOfDay.toISOString()]
            ]);

            return planningEntries.length > 0 ? planningEntries[0] : null;
        } catch (error) {
            Logger.error('Error getting planning for date:', error);
            return null;
        }
    }

    // Exporter les données
    exportData(startDate, endDate, format = 'csv') {
        const filteredEntries = this.timeEntries.filter(entry => {
            const entryDate = new Date(entry.createdAt);
            return entryDate >= startDate && entryDate <= endDate;
        });

        if (format === 'csv') {
            return this.exportToCSV(filteredEntries);
        } else if (format === 'json') {
            return this.exportToJSON(filteredEntries);
        }
    }

    // Exporter en CSV
    exportToCSV(entries) {
        const headers = [
            'Date', 'Arrivée', 'Départ', 'Temps travaillé (h)', 
            'Temps pause (min)', 'Commentaire arrivée', 'Commentaire départ', 
            'Distanciel', 'Formation'
        ];
        
        const rows = entries.map(entry => [
            new Date(entry.createdAt).toLocaleDateString('fr-FR'),
            entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('fr-FR') : '',
            entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('fr-FR') : 'En cours',
            entry.totalWorkTime ? (entry.totalWorkTime / 60).toFixed(2) : '0',
            entry.totalBreakTime || '0',
            entry.clockInComment || '',
            entry.clockOutComment || '',
            entry.isRemote ? 'Oui' : 'Non',
            entry.isTraining ? 'Oui' : 'Non'
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    // Exporter en JSON
    exportToJSON(entries) {
        return JSON.stringify(entries, null, 2);
    }

    // Méthodes d'administration
    async updateTimeEntry(entryId, updateData) {
        try {
            const user = FirebaseService.getCurrentUser();
            if (!user || !user.isAdmin) {
                throw new Error('Accès administrateur requis');
            }

            await FirebaseService.updateDocument('timeclock_sessions', entryId, {
                ...updateData,
                updatedAt: new Date().toISOString(),
                modifiedBy: user.uid
            });

            EventBus.emit('timeclock:entryUpdated', { entryId, updateData });
            return true;
        } catch (error) {
            Logger.error('Error updating time entry:', error);
            throw error;
        }
    }

    // Getters
    getCurrentSession() {
        return this.currentSession;
    }

    getTimeEntries() {
        return this.timeEntries;
    }

    isCurrentlyOnBreak() {
        return this.isOnBreak;
    }

    getCurrentBreakDuration() {
        if (!this.isOnBreak || !this.currentBreakStart) return 0;
        return Math.floor((Date.now() - this.currentBreakStart.getTime()) / 1000 / 60);
    }
}