// js/modules/planning/planning-manager.js
// Gestionnaire de planning et calendrier

class PlanningManager {
    constructor() {
        this.shifts = new Map();
        this.events = new Map();
        this.absences = new Map();
        this.unsubscribers = [];
        this.currentView = 'week';
        this.currentDate = new Date();
        this.isReady = false;
        this.init();
    }

    async init() {
        await window.firebaseManager.waitForReady();
        
        // Charger les données initiales
        await this.loadCurrentPeriod();
        
        // Écouter les changements
        this.subscribeToUpdates();
        
        this.isReady = true;
        console.log('✅ PlanningManager initialisé');
    }

    // Charger la période actuelle
    async loadCurrentPeriod() {
        const startDate = this.getWeekStart(this.currentDate);
        const endDate = this.getWeekEnd(this.currentDate);
        
        await this.loadShifts(startDate, endDate);
        await this.loadEvents(startDate, endDate);
        await this.loadAbsences(startDate, endDate);
    }

    // S'abonner aux mises à jour
    subscribeToUpdates() {
        const startDate = this.getWeekStart(this.currentDate);
        const endDate = this.getWeekEnd(this.currentDate);
        
        // Écouter les shifts
        const shiftsUnsubscribe = window.firebaseManager.collection('shifts')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const shift = { id: change.doc.id, ...change.doc.data() };
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        this.shifts.set(shift.id, shift);
                        this.notifyUpdate('shift:updated', shift);
                    } else if (change.type === 'removed') {
                        this.shifts.delete(shift.id);
                        this.notifyUpdate('shift:removed', shift);
                    }
                });
                
                this.notifyUpdate('shifts:updated', this.getShifts());
            });
        
        this.unsubscribers.push(shiftsUnsubscribe);
    }

    // Créer un shift
    async createShift(shiftData) {
        try {
            // Validation
            if (!shiftData.employeeId || !shiftData.date || !shiftData.startTime || !shiftData.endTime) {
                throw new Error('Données de shift incomplètes');
            }
            
            // Vérifier les conflits
            const conflicts = await this.checkShiftConflicts(shiftData);
            if (conflicts.length > 0) {
                throw new Error(`Conflit détecté: ${conflicts[0].reason}`);
            }
            
            // Préparer les données
            const shift = {
                employeeId: shiftData.employeeId,
                date: this.dateToTimestamp(shiftData.date),
                startTime: shiftData.startTime,
                endTime: shiftData.endTime,
                position: shiftData.position || null,
                breakDuration: shiftData.breakDuration || 0,
                status: 'scheduled',
                notes: this.sanitizeInput(shiftData.notes || ''),
                color: shiftData.color || '#8b5cf6',
                createdBy: window.firebaseManager.currentUser?.uid,
                createdAt: window.firebaseManager.timestamp(),
                modifiedAt: window.firebaseManager.timestamp()
            };
            
            // Calculer les heures
            shift.totalHours = this.calculateHours(shift.startTime, shift.endTime, shift.breakDuration);
            
            // Ajouter à Firestore
            const docRef = await window.firebaseManager.collection('shifts').add(shift);
            shift.id = docRef.id;
            
            // Créer une notification pour l'employé
            await this.notifyEmployee(shift);
            
            this.logAnalytics('shift_created', {
                shiftId: shift.id,
                employeeId: shift.employeeId,
                date: shift.date.toDate().toISOString()
            });
            
            return shift;
        } catch (error) {
            console.error('❌ Erreur création shift:', error);
            throw error;
        }
    }

    // Mettre à jour un shift
    async updateShift(shiftId, updates) {
        try {
            const shift = this.shifts.get(shiftId);
            if (!shift) throw new Error('Shift introuvable');
            
            // Vérifier les conflits si les horaires changent
            if (updates.startTime || updates.endTime || updates.date) {
                const newShiftData = { ...shift, ...updates };
                const conflicts = await this.checkShiftConflicts(newShiftData, shiftId);
                if (conflicts.length > 0) {
                    throw new Error(`Conflit détecté: ${conflicts[0].reason}`);
                }
            }
            
            // Préparer les mises à jour
            const cleanUpdates = {};
            
            if (updates.date) cleanUpdates.date = this.dateToTimestamp(updates.date);
            if (updates.startTime) cleanUpdates.startTime = updates.startTime;
            if (updates.endTime) cleanUpdates.endTime = updates.endTime;
            if (updates.position !== undefined) cleanUpdates.position = updates.position;
            if (updates.breakDuration !== undefined) cleanUpdates.breakDuration = updates.breakDuration;
            if (updates.notes !== undefined) cleanUpdates.notes = this.sanitizeInput(updates.notes);
            if (updates.status) cleanUpdates.status = updates.status;
            
            // Recalculer les heures si nécessaire
            if (updates.startTime || updates.endTime || updates.breakDuration !== undefined) {
                const startTime = updates.startTime || shift.startTime;
                const endTime = updates.endTime || shift.endTime;
                const breakDuration = updates.breakDuration !== undefined ? updates.breakDuration : shift.breakDuration;
                cleanUpdates.totalHours = this.calculateHours(startTime, endTime, breakDuration);
            }
            
            cleanUpdates.modifiedAt = window.firebaseManager.timestamp();
            cleanUpdates.modifiedBy = window.firebaseManager.currentUser?.uid;
            
            // Mettre à jour
            await window.firebaseManager.collection('shifts').doc(shiftId).update(cleanUpdates);
            
            // Notifier l'employé si changement significatif
            if (updates.date || updates.startTime || updates.endTime) {
                await this.notifyEmployee({ ...shift, ...cleanUpdates }, 'modified');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour shift:', error);
            throw error;
        }
    }

    // Supprimer un shift
    async deleteShift(shiftId) {
        try {
            const shift = this.shifts.get(shiftId);
            if (!shift) throw new Error('Shift introuvable');
            
            await window.firebaseManager.collection('shifts').doc(shiftId).delete();
            
            // Notifier l'employé
            await this.notifyEmployee(shift, 'cancelled');
            
            this.logAnalytics('shift_deleted', { shiftId });
            
            return true;
        } catch (error) {
            console.error('❌ Erreur suppression shift:', error);
            throw error;
        }
    }

    // Dupliquer des shifts
    async duplicateShifts(sourceWeek, targetWeek, employeeIds = null) {
        try {
            const sourceStart = this.getWeekStart(sourceWeek);
            const sourceEnd = this.getWeekEnd(sourceWeek);
            const targetStart = this.getWeekStart(targetWeek);
            
            // Récupérer les shifts de la semaine source
            let query = window.firebaseManager.collection('shifts')
                .where('date', '>=', sourceStart)
                .where('date', '<=', sourceEnd);
            
            if (employeeIds && employeeIds.length > 0) {
                query = query.where('employeeId', 'in', employeeIds);
            }
            
            const snapshot = await query.get();
            const createdShifts = [];
            
            // Calculer le décalage en jours
            const dayOffset = Math.floor((targetStart - sourceStart) / (1000 * 60 * 60 * 24));
            
            // Créer les nouveaux shifts
            for (const doc of snapshot.docs) {
                const sourceShift = doc.data();
                const newDate = new Date(sourceShift.date.toDate());
                newDate.setDate(newDate.getDate() + dayOffset);
                
                const newShift = {
                    ...sourceShift,
                    date: newDate,
                    status: 'scheduled',
                    createdAt: window.firebaseManager.timestamp(),
                    createdBy: window.firebaseManager.currentUser?.uid,
                    sourceShiftId: doc.id
                };
                
                delete newShift.id;
                
                try {
                    const created = await this.createShift(newShift);
                    createdShifts.push(created);
                } catch (error) {
                    console.warn('Shift non dupliqué (conflit possible):', error.message);
                }
            }
            
            this.logAnalytics('shifts_duplicated', {
                count: createdShifts.length,
                sourceWeek: sourceStart.toISOString(),
                targetWeek: targetStart.toISOString()
            });
            
            return createdShifts;
        } catch (error) {
            console.error('❌ Erreur duplication shifts:', error);
            throw error;
        }
    }

    // Créer un événement
    async createEvent(eventData) {
        try {
            const event = {
                title: this.sanitizeInput(eventData.title),
                description: this.sanitizeInput(eventData.description || ''),
                type: eventData.type || 'event', // 'event', 'meeting', 'training', 'holiday'
                startDate: this.dateToTimestamp(eventData.startDate),
                endDate: this.dateToTimestamp(eventData.endDate),
                allDay: eventData.allDay || false,
                location: this.sanitizeInput(eventData.location || ''),
                attendees: eventData.attendees || [],
                color: eventData.color || '#3b82f6',
                reminders: eventData.reminders || [],
                recurring: eventData.recurring || false,
                recurringPattern: eventData.recurringPattern || null,
                createdBy: window.firebaseManager.currentUser?.uid,
                createdAt: window.firebaseManager.timestamp()
            };
            
            const docRef = await window.firebaseManager.collection('events').add(event);
            event.id = docRef.id;
            
            // Créer des notifications pour les participants
            if (event.attendees.length > 0) {
                await this.notifyEventAttendees(event);
            }
            
            return event;
        } catch (error) {
            console.error('❌ Erreur création événement:', error);
            throw error;
        }
    }

    // Créer une absence
    async createAbsence(absenceData) {
        try {
            const absence = {
                employeeId: absenceData.employeeId,
                type: absenceData.type, // 'vacation', 'sick', 'personal', 'other'
                startDate: this.dateToTimestamp(absenceData.startDate),
                endDate: this.dateToTimestamp(absenceData.endDate),
                reason: this.sanitizeInput(absenceData.reason || ''),
                status: 'pending', // 'pending', 'approved', 'rejected'
                approvedBy: null,
                approvedAt: null,
                notes: this.sanitizeInput(absenceData.notes || ''),
                createdBy: absenceData.employeeId,
                createdAt: window.firebaseManager.timestamp()
            };
            
            // Calculer le nombre de jours
            absence.totalDays = this.calculateDays(absence.startDate, absence.endDate);
            
            const docRef = await window.firebaseManager.collection('absences').add(absence);
            absence.id = docRef.id;
            
            // Notifier les managers
            await this.notifyManagersAbsence(absence);
            
            return absence;
        } catch (error) {
            console.error('❌ Erreur création absence:', error);
            throw error;
        }
    }

    // Approuver/Rejeter une absence
    async updateAbsenceStatus(absenceId, status, notes = '') {
        try {
            const updates = {
                status: status,
                notes: this.sanitizeInput(notes),
                approvedBy: window.firebaseManager.currentUser?.uid,
                approvedAt: window.firebaseManager.timestamp()
            };
            
            await window.firebaseManager.collection('absences').doc(absenceId).update(updates);
            
            // Si approuvée, supprimer les shifts concernés
            if (status === 'approved') {
                const absence = (await window.firebaseManager.collection('absences').doc(absenceId).get()).data();
                await this.removeShiftsForAbsence(absence);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour absence:', error);
            throw error;
        }
    }

    // Vérifier les conflits de shift
    async checkShiftConflicts(shiftData, excludeShiftId = null) {
        const conflicts = [];
        
        // Vérifier les chevauchements avec d'autres shifts du même employé
        const employeeShifts = await window.firebaseManager.collection('shifts')
            .where('employeeId', '==', shiftData.employeeId)
            .where('date', '==', this.dateToTimestamp(shiftData.date))
            .get();
        
        employeeShifts.forEach(doc => {
            if (doc.id === excludeShiftId) return;
            
            const existingShift = doc.data();
            if (this.timeOverlap(
                shiftData.startTime, 
                shiftData.endTime, 
                existingShift.startTime, 
                existingShift.endTime
            )) {
                conflicts.push({
                    type: 'shift_overlap',
                    reason: `Chevauchement avec un autre shift (${existingShift.startTime}-${existingShift.endTime})`,
                    conflictingShiftId: doc.id
                });
            }
        });
        
        // Vérifier les absences approuvées
        const absences = await window.firebaseManager.collection('absences')
            .where('employeeId', '==', shiftData.employeeId)
            .where('status', '==', 'approved')
            .where('startDate', '<=', this.dateToTimestamp(shiftData.date))
            .where('endDate', '>=', this.dateToTimestamp(shiftData.date))
            .get();
        
        if (!absences.empty) {
            conflicts.push({
                type: 'absence',
                reason: 'L\'employé est absent ce jour',
                absenceId: absences.docs[0].id
            });
        }
        
        // Vérifier les limites légales (exemple: max 10h/jour)
        if (shiftData.totalHours > 10) {
            conflicts.push({
                type: 'legal_limit',
                reason: 'Le shift dépasse la limite légale de 10h/jour'
            });
        }
        
        return conflicts;
    }

    // Vérifier le chevauchement d'horaires
    timeOverlap(start1, end1, start2, end2) {
        const s1 = this.timeToMinutes(start1);
        const e1 = this.timeToMinutes(end1);
        const s2 = this.timeToMinutes(start2);
        const e2 = this.timeToMinutes(end2);
        
        return (s1 < e2 && e1 > s2);
    }

    // Convertir heure en minutes
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Calculer les heures travaillées
    calculateHours(startTime, endTime, breakDuration = 0) {
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        const totalMinutes = end - start - breakDuration;
        return Math.max(0, totalMinutes / 60);
    }

    // Calculer le nombre de jours
    calculateDays(startDate, endDate) {
        const start = startDate.toDate ? startDate.toDate() : new Date(startDate);
        const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Obtenir le début de la semaine
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi
        return new Date(d.setDate(diff));
    }

    // Obtenir la fin de la semaine
    getWeekEnd(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + 7; // Dimanche
        return new Date(d.setDate(diff));
    }

    // Convertir date en timestamp Firestore
    dateToTimestamp(date) {
        if (date.toDate) return date; // Déjà un timestamp
        return firebase.firestore.Timestamp.fromDate(new Date(date));
    }

    // Charger les shifts
    async loadShifts(startDate, endDate) {
        const snapshot = await window.firebaseManager.collection('shifts')
            .where('date', '>=', this.dateToTimestamp(startDate))
            .where('date', '<=', this.dateToTimestamp(endDate))
            .get();
        
        this.shifts.clear();
        snapshot.forEach(doc => {
            this.shifts.set(doc.id, { id: doc.id, ...doc.data() });
        });
    }

    // Charger les événements
    async loadEvents(startDate, endDate) {
        const snapshot = await window.firebaseManager.collection('events')
            .where('startDate', '<=', this.dateToTimestamp(endDate))
            .where('endDate', '>=', this.dateToTimestamp(startDate))
            .get();
        
        this.events.clear();
        snapshot.forEach(doc => {
            this.events.set(doc.id, { id: doc.id, ...doc.data() });
        });
    }

    // Charger les absences
    async loadAbsences(startDate, endDate) {
        const snapshot = await window.firebaseManager.collection('absences')
            .where('startDate', '<=', this.dateToTimestamp(endDate))
            .where('endDate', '>=', this.dateToTimestamp(startDate))
            .get();
        
        this.absences.clear();
        snapshot.forEach(doc => {
            this.absences.set(doc.id, { id: doc.id, ...doc.data() });
        });
    }

    // Obtenir les shifts
    getShifts(employeeId = null, date = null) {
        let shifts = Array.from(this.shifts.values());
        
        if (employeeId) {
            shifts = shifts.filter(s => s.employeeId === employeeId);
        }
        
        if (date) {
            const targetDate = this.dateToTimestamp(date).toDate().toDateString();
            shifts = shifts.filter(s => s.date.toDate().toDateString() === targetDate);
        }
        
        return shifts.sort((a, b) => {
            const dateCompare = a.date.toMillis() - b.date.toMillis();
            if (dateCompare !== 0) return dateCompare;
            return this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
        });
    }

    // Obtenir les événements
    getEvents(date = null) {
        let events = Array.from(this.events.values());
        
        if (date) {
            const targetDate = this.dateToTimestamp(date);
            events = events.filter(e => 
                e.startDate.toMillis() <= targetDate.toMillis() &&
                e.endDate.toMillis() >= targetDate.toMillis()
            );
        }
        
        return events.sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis());
    }

    // Obtenir les absences
    getAbsences(employeeId = null, status = null) {
        let absences = Array.from(this.absences.values());
        
        if (employeeId) {
            absences = absences.filter(a => a.employeeId === employeeId);
        }
        
        if (status) {
            absences = absences.filter(a => a.status === status);
        }
        
        return absences.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }

    // Obtenir la vue planning pour une semaine
    getWeekView(weekDate) {
        const weekStart = this.getWeekStart(weekDate);
        const weekEnd = this.getWeekEnd(weekDate);
        const days = [];
        
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
            const date = new Date(d);
            days.push({
                date: date,
                dateString: date.toDateString(),
                shifts: this.getShifts(null, date),
                events: this.getEvents(date),
                absences: this.getAbsences().filter(a => {
                    const start = a.startDate.toDate();
                    const end = a.endDate.toDate();
                    return date >= start && date <= end;
                })
            });
        }
        
        return {
            weekStart,
            weekEnd,
            days
        };
    }

    // Statistiques du planning
    async getPlanningStats(startDate, endDate) {
        const stats = {
            totalShifts: 0,
            totalHours: 0,
            employeeHours: {},
            positionHours: {},
            coverage: {}
        };
        
        const shifts = await window.firebaseManager.collection('shifts')
            .where('date', '>=', this.dateToTimestamp(startDate))
            .where('date', '<=', this.dateToTimestamp(endDate))
            .get();
        
        shifts.forEach(doc => {
            const shift = doc.data();
            stats.totalShifts++;
            stats.totalHours += shift.totalHours || 0;
            
            // Heures par employé
            if (!stats.employeeHours[shift.employeeId]) {
                stats.employeeHours[shift.employeeId] = 0;
            }
            stats.employeeHours[shift.employeeId] += shift.totalHours || 0;
            
            // Heures par position
            if (shift.position) {
                if (!stats.positionHours[shift.position]) {
                    stats.positionHours[shift.position] = 0;
                }
                stats.positionHours[shift.position] += shift.totalHours || 0;
            }
        });
        
        return stats;
    }

    // Notifications
    async notifyEmployee(shift, action = 'created') {
        const messages = {
            created: 'Un nouveau shift a été créé pour vous',
            modified: 'Un de vos shifts a été modifié',
            cancelled: 'Un de vos shifts a été annulé'
        };
        
        await window.firebaseManager.collection('notifications').add({
            userId: shift.employeeId,
            type: `shift_${action}`,
            title: messages[action],
            content: `${shift.date.toDate().toLocaleDateString()} - ${shift.startTime} à ${shift.endTime}`,
            data: { shiftId: shift.id },
            read: false,
            createdAt: window.firebaseManager.timestamp()
        });
    }

    async notifyEventAttendees(event) {
        for (const attendeeId of event.attendees) {
            await window.firebaseManager.collection('notifications').add({
                userId: attendeeId,
                type: 'event_invitation',
                title: `Invitation: ${event.title}`,
                content: event.description,
                data: { eventId: event.id },
                read: false,
                createdAt: window.firebaseManager.timestamp()
            });
        }
    }

    async notifyManagersAbsence(absence) {
        // Récupérer les managers
        const managers = await window.firebaseManager.collection('users')
            .where('role', 'in', ['admin', 'manager'])
            .get();
        
        for (const doc of managers.docs) {
            await window.firebaseManager.collection('notifications').add({
                userId: doc.id,
                type: 'absence_request',
                title: 'Nouvelle demande d\'absence',
                content: `${absence.totalDays} jour(s) - ${absence.type}`,
                data: { absenceId: absence.id },
                read: false,
                createdAt: window.firebaseManager.timestamp()
            });
        }
    }

    // Retirer les shifts pendant une absence
    async removeShiftsForAbsence(absence) {
        const shifts = await window.firebaseManager.collection('shifts')
            .where('employeeId', '==', absence.employeeId)
            .where('date', '>=', absence.startDate)
            .where('date', '<=', absence.endDate)
            .get();
        
        const batch = window.firebaseManager.db.batch();
        shifts.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
    }

    // Utilitaires
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }

    // Analytics
    logAnalytics(event, data) {
        window.firebaseManager.collection('analytics').add({
            event: `planning:${event}`,
            data,
            userId: window.firebaseManager.currentUser?.uid,
            timestamp: window.firebaseManager.timestamp()
        }).catch(console.error);
    }

    // Notifications
    notifyUpdate(event, data) {
        document.dispatchEvent(new CustomEvent(`planning:${event}`, { detail: data }));
    }

    // Nettoyage
    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        this.shifts.clear();
        this.events.clear();
        this.absences.clear();
    }
}

// Instance globale
window.planningManager = new PlanningManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningManager;
}